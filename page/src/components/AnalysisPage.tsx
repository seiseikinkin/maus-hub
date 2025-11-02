import React, { useEffect, useState, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { replayService } from '../firebase/replayService';
import type { ReplayData } from '../firebase/replayService';
import { useAuth } from '../contexts/AuthContext';
import { settingsService } from '../firebase/settingsService';

// Chart.js の必要なコンポーネントを登録
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface RatingData {
    date: string;
    dateTime: string;
    rating: number;
    replayUrl: string;
    players: string[];
    format: string;
    teams: Record<string, string[]>;
    selectedPokemon: Record<string, string[]>;
    winStatus: 'win' | 'loss' | 'unknown';
    playerName: string;
}

// ポケモン画像のURLを生成するヘルパー関数
const getPokemonImageUrl = (pokemonName: string): string => {
    if (!pokemonName) return '';
    
    // ポケモン名を正規化（スペースをハイフンに変換、小文字に）
    const normalizedName = pokemonName
        .toLowerCase()
        .replace(/\s+/g, '-')  // スペースをハイフンに変換
        .replace(/-\*$/, '');  // 末尾の「-*」を削除
    
    // 指定されたminispritesのURL
    return `https://seiseikinkin.github.io/tools/image/minisprites/${normalizedName}.png`;
};

// フォールバック画像（同じURLで統一）
const getPokemonFallbackUrl = (pokemonName: string): string => {
    return getPokemonImageUrl(pokemonName);
};

// 勝敗判定関数（複数プレーヤー名対応）
const determineWinStatus = (battleLog: string, playerNames: string[], players: string[]): 'win' | 'loss' | 'unknown' => {
    if (!battleLog || !playerNames || playerNames.length === 0 || !players || players.length === 0) {
        return 'unknown';
    }

    try {
        const logLines = battleLog.split('\n');
        
        // 勝利条件をチェック
        for (const line of logLines) {
            if (line.includes('|win|')) {
                const winnerMatch = line.match(/\|win\|(.+)/);
                if (winnerMatch) {
                    const winner = winnerMatch[1].trim();
                    // 登録されたプレーヤー名のいずれかが勝者の場合
                    if (playerNames.includes(winner)) {
                        return 'win';
                    } else if (players.includes(winner)) {
                        return 'loss';
                    }
                }
            }
        }
        
        return 'unknown';
    } catch (error) {
        console.error('勝敗判定エラー:', error);
        return 'unknown';
    }
};

// ポケモン画像コンポーネント
const PokemonImage: React.FC<{ pokemonName: string; className?: string }> = ({ pokemonName, className = '' }) => {
    const [imageSrc, setImageSrc] = useState(getPokemonImageUrl(pokemonName));
    const [hasError, setHasError] = useState(false);

    const handleImageError = () => {
        if (!hasError) {
            setHasError(true);
            setImageSrc(getPokemonFallbackUrl(pokemonName));
        }
    };

    if (!pokemonName) {
        return <div className={`pokemon-placeholder ${className}`}>?</div>;
    }

    return (
        <img
            src={imageSrc}
            alt={pokemonName}
            className={`pokemon-image ${className}`}
            onError={handleImageError}
            title={pokemonName}
        />
    );
};

const AnalysisPage: React.FC = () => {
    const { user } = useAuth();
    const [ratingData, setRatingData] = useState<RatingData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFormat, setSelectedFormat] = useState<string>('all');
    const [availableFormats, setAvailableFormats] = useState<string[]>([]);
    const [currentPlayerNames, setCurrentPlayerNames] = useState<string[]>([]);

    const [stats, setStats] = useState({
        totalReplays: 0,
        highestRating: 0,
        winRate: 0,
        wins: 0,
        losses: 0
    });

    const [opponentTrends, setOpponentTrends] = useState<{
        winAgainst: { pokemon: Record<string, number>; commonTeams: string[][] };
        lossAgainst: { pokemon: Record<string, number>; commonTeams: string[][] };
    }>({
        winAgainst: { pokemon: {}, commonTeams: [] },
        lossAgainst: { pokemon: {}, commonTeams: [] }
    });

    const loadRatingData = useCallback(async () => {
        if (!user) return;
        
        setLoading(true);
        try {
            // ユーザー設定とリプレイデータを並行して取得
            const [userSettings, replays] = await Promise.all([
                settingsService.getUserSettings(user.uid),
                replayService.getReplaysByUser(user.uid, 200)
            ]);

            const playerNames = settingsService.getPlayerNames(userSettings);
            setCurrentPlayerNames(playerNames);
            
            // プレーヤー名が設定されていない場合は早期リターン
            if (playerNames.length === 0) {
                setRatingData([]);
                setStats({
                    totalReplays: 0,
                    highestRating: 0,
                    winRate: 0,
                    wins: 0,
                    losses: 0
                });
                setLoading(false);
                return;
            }
            
            // レーティングデータのある有効なリプレイのみフィルター
            const validReplays = replays
                .filter((replay: ReplayData) => {
                    // レーティング情報があること
                    if (!replay.rating || replay.rating <= 0) {
                        return false;
                    }
                    
                    // 自分のプレーヤー名がプレイヤーリストに含まれていること
                    const hasPlayerName = playerNames.some(playerName => 
                        replay.players.includes(playerName)
                    );
                    
                    return hasPlayerName;
                })
                .sort((a: ReplayData, b: ReplayData) => {
                    // バトル日時で並び替え（新しい順）
                    if (a.battleDate && b.battleDate) {
                        return new Date(b.battleDate).getTime() - new Date(a.battleDate).getTime();
                    }
                    // バトル日時がない場合は作成日時で並び替え（新しい順）
                    return b.createdAt - a.createdAt;
                });

            const ratingDataArray: RatingData[] = validReplays.map((replay: ReplayData) => {
                const battleDateTime = replay.battleStartTime 
                    ? new Date(replay.battleStartTime)
                    : replay.battleDate 
                        ? new Date(replay.battleDate)
                        : new Date(replay.createdAt);
                
                // 勝敗判定（バトルログから判定）
                const winStatus = determineWinStatus(replay.battleLog, playerNames, replay.players);
                
                return {
                    date: battleDateTime.toLocaleDateString('ja-JP'),
                    dateTime: battleDateTime.toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    rating: replay.rating!,
                    replayUrl: replay.url,
                    players: replay.players,
                    format: replay.format,
                    teams: replay.teams || {},
                    selectedPokemon: replay.selectedPokemon || {},
                    winStatus: winStatus,
                    playerName: playerNames[0] || ''  // 表示用には最初の名前を使用
                };
            });

            setRatingData(ratingDataArray);

            // 利用可能なフォーマットを抽出
            const formats = [...new Set(ratingDataArray.map(data => data.format))];
            setAvailableFormats(formats);

            // 統計情報を計算
            if (ratingDataArray.length > 0) {
                const ratings = ratingDataArray.map(data => data.rating);
                const total = ratingDataArray.length;
                const highest = Math.max(...ratings);

                // 勝敗数を計算
                const wins = ratingDataArray.filter(data => data.winStatus === 'win').length;
                const losses = ratingDataArray.filter(data => data.winStatus === 'loss').length;
                const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

                setStats({
                    totalReplays: total,
                    highestRating: highest,
                    winRate: winRate,
                    wins: wins,
                    losses: losses
                });

                // 相手の傾向分析
                const winData = ratingDataArray.filter(data => data.winStatus === 'win');
                const lossData = ratingDataArray.filter(data => data.winStatus === 'loss');

                const analyzeOpponentTrends = (data: RatingData[]) => {
                    const pokemonCount: Record<string, number> = {};
                    const teams: string[][] = [];

                    data.forEach(replay => {
                        // 相手のチーム（自分以外のプレイヤー）
                        const opponentPlayers = replay.players.filter(player => 
                            !playerNames.includes(player)
                        );
                        
                        opponentPlayers.forEach(opponent => {
                            const opponentTeam = replay.teams[opponent] || [];
                            if (opponentTeam.length > 0) {
                                teams.push(opponentTeam);
                                opponentTeam.forEach(pokemon => {
                                    pokemonCount[pokemon] = (pokemonCount[pokemon] || 0) + 1;
                                });
                            }
                        });
                    });

                    return { pokemon: pokemonCount, commonTeams: teams.slice(0, 10) };
                };

                setOpponentTrends({
                    winAgainst: analyzeOpponentTrends(winData),
                    lossAgainst: analyzeOpponentTrends(lossData)
                });
            }

        } catch (error) {
            console.error('Failed to load rating data:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadRatingData();
    }, [loadRatingData]);

    // フォーマットフィルターを適用したデータ
    const filteredRatingData = selectedFormat === 'all' 
        ? ratingData 
        : ratingData.filter(data => data.format === selectedFormat);

    // グラフ用データ（時系列順：古いものから新しいものへ）
    const chartRatingData = [...filteredRatingData].reverse();

    // グラフデータの生成
    const chartData = {
        labels: chartRatingData.map((_, index) => `第${index + 1}戦`),
        datasets: [
            {
                label: 'レーティング',
                data: chartRatingData.map(data => data.rating),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.1
            }
        ]
    };

    // グラフオプション
    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: selectedFormat === 'all' ? 'レーティング推移（全フォーマット）' : `レーティング推移（${selectedFormat}）`,
                font: {
                    size: 16
                }
            },
            legend: {
                display: true,
                position: 'top' as const,
            },
            tooltip: {
                callbacks: {
                    title: (tooltipItems: TooltipItem<'line'>[]) => {
                        const index = tooltipItems[0].dataIndex;
                        const data = chartRatingData[index];
                        return `${data.date} - ${data.format}`;
                    },
                    label: (tooltipItem: TooltipItem<'line'>) => {
                        const index = tooltipItem.dataIndex;
                        const data = chartRatingData[index];
                        return [
                            `レーティング: ${tooltipItem.parsed.y}`,
                            `プレイヤー: ${data.players.join(' vs ')}`
                        ];
                    },
                    afterLabel: (tooltipItem: TooltipItem<'line'>) => {
                        const index = tooltipItem.dataIndex;
                        const data = chartRatingData[index];
                        return `リプレイ: ${data.replayUrl}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'レーティング'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'バトル順'
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="analysis-page">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="analysis-page">
                <div className="error-message">
                    <p>分析ページを表示するにはログインしてください。</p>
                </div>
            </div>
        );
    }

    if (ratingData.length === 0) {
        return (
            <div className="analysis-page">
                <div className="no-data-message">
                    <h2>分析データがありません</h2>
                    <p>以下の点をご確認ください：</p>
                    <ul>
                        <li>設定ページでプレーヤー名が正しく設定されているか</li>
                        <li>レーティング情報のあるリプレイが追加されているか</li>
                    </ul>
                    <p>設定後、分析ページを再読み込みしてください。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analysis-page">
            <div className="analysis-header">
                <h1>レーティング分析</h1>
                <div className="filter-controls">
                    <label htmlFor="format-filter">フォーマット:</label>
                    <select 
                        id="format-filter"
                        value={selectedFormat} 
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        className="format-selector"
                    >
                        <option value="all">全フォーマット</option>
                        {availableFormats.map(format => (
                            <option key={format} value={format}>{format}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="stats-overview">
                <div className="stat-card">
                    <h3>最高レーティング</h3>
                    <div className="stat-value">{stats.highestRating}</div>
                </div>
                <div className="stat-card">
                    <h3>対戦数</h3>
                    <div className="stat-value">{stats.totalReplays}</div>
                </div>
                <div className="stat-card">
                    <h3>勝利数</h3>
                    <div className="stat-value positive">{stats.wins}</div>
                </div>
                <div className="stat-card">
                    <h3>敗北数</h3>
                    <div className="stat-value negative">{stats.losses}</div>
                </div>
                <div className="stat-card">
                    <h3>勝率</h3>
                    <div className="stat-value">{stats.winRate}%</div>
                </div>
            </div>

            <div className="chart-container">
                <Line data={chartData} options={chartOptions} />
            </div>

            <div className="data-table">
                <h2>詳細データ</h2>
                <table>
                    <thead>
                        <tr>
                            <th>日時</th>
                            <th>勝敗</th>
                            <th>レーティング</th>
                            <th>マッチアップ</th>
                            <th>選出</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRatingData.map((data, index) => {
                            // 設定されたプレイヤー名に基づいて自分と相手を判定
                            const myPlayerIndex = data.players.findIndex(player => 
                                currentPlayerNames.includes(player)
                            );
                            const opponentPlayerIndex = myPlayerIndex === 0 ? 1 : 0;
                            
                            const myTeam = myPlayerIndex >= 0 ? (data.teams[data.players[myPlayerIndex]] || []) : [];
                            const opponentTeam = data.players[opponentPlayerIndex] ? (data.teams[data.players[opponentPlayerIndex]] || []) : [];
                            const mySelectedPokemon = myPlayerIndex >= 0 ? (data.selectedPokemon[data.players[myPlayerIndex]] || []) : [];
                            const opponentSelectedPokemon = data.players[opponentPlayerIndex] ? (data.selectedPokemon[data.players[opponentPlayerIndex]] || []) : [];

                            return (
                                <tr 
                                    key={index} 
                                    className="clickable-row"
                                    onClick={() => window.open(data.replayUrl, '_blank')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{data.dateTime}</td>
                                    <td className="win-status-cell">
                                        <span className={`win-status ${data.winStatus}`}>
                                            {data.winStatus === 'win' ? 'Win' : data.winStatus === 'loss' ? 'Loss' : 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="rating-cell">{data.rating}</td>
                                    <td className="matchup-cell">
                                        <div className="matchup-display-inline">
                                            <div className="pokemon-grid">
                                                {myTeam.slice(0, 6).map((pokemon, pokemonIndex) => (
                                                    <PokemonImage 
                                                        key={pokemonIndex} 
                                                        pokemonName={pokemon} 
                                                        className="team-pokemon"
                                                    />
                                                ))}
                                            </div>
                                            <div className="vs-divider-inline">VS</div>
                                            <div className="pokemon-grid">
                                                {opponentTeam.slice(0, 6).map((pokemon, pokemonIndex) => (
                                                    <PokemonImage 
                                                        key={pokemonIndex} 
                                                        pokemonName={pokemon} 
                                                        className="team-pokemon"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="selection-cell">
                                        <div className="selection-display-inline">
                                            <div className="pokemon-grid">
                                                {mySelectedPokemon.slice(0, 4).map((pokemon, pokemonIndex) => (
                                                    <PokemonImage 
                                                        key={pokemonIndex} 
                                                        pokemonName={pokemon} 
                                                        className="selected-pokemon"
                                                    />
                                                ))}
                                                {/* 空のスロットを埋める */}
                                                {Array.from({ length: Math.max(0, 4 - mySelectedPokemon.length) }, (_, i) => (
                                                    <div key={`empty-my-${i}`} className="pokemon-placeholder"></div>
                                                ))}
                                            </div>
                                            <div className="vs-divider-inline">VS</div>
                                            <div className="pokemon-grid">
                                                {opponentSelectedPokemon.slice(0, 4).map((pokemon, pokemonIndex) => (
                                                    <PokemonImage 
                                                        key={pokemonIndex} 
                                                        pokemonName={pokemon} 
                                                        className="selected-pokemon"
                                                    />
                                                ))}
                                                {/* 空のスロットを埋める */}
                                                {Array.from({ length: Math.max(0, 4 - opponentSelectedPokemon.length) }, (_, i) => (
                                                    <div key={`empty-opp-${i}`} className="pokemon-placeholder"></div>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 相手の傾向分析セクション */}
            <div className="opponent-trends-section">
                <h2>相手の傾向分析</h2>
                
                <div className="trends-container">
                    {/* 勝った相手の傾向 */}
                    <div className="trend-section win-trends">
                        <h3>勝利した相手の傾向</h3>
                        <div className="trend-content">
                            <div className="pokemon-frequency">
                                <h4>よく見たポケモン（上位10匹）</h4>
                                <div className="pokemon-list">
                                    {Object.entries(opponentTrends.winAgainst.pokemon)
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 10)
                                        .map(([pokemon, count]) => (
                                            <div key={pokemon} className="pokemon-frequency-item">
                                                <PokemonImage pokemonName={pokemon} className="frequency-pokemon" />
                                                <span className="pokemon-name">{pokemon}</span>
                                                <span className="frequency-count">{count}回</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 負けた相手の傾向 */}
                    <div className="trend-section loss-trends">
                        <h3>敗北した相手の傾向</h3>
                        <div className="trend-content">
                            <div className="pokemon-frequency">
                                <h4>よく見たポケモン（上位10匹）</h4>
                                <div className="pokemon-list">
                                    {Object.entries(opponentTrends.lossAgainst.pokemon)
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 10)
                                        .map(([pokemon, count]) => (
                                            <div key={pokemon} className="pokemon-frequency-item">
                                                <PokemonImage pokemonName={pokemon} className="frequency-pokemon" />
                                                <span className="pokemon-name">{pokemon}</span>
                                                <span className="frequency-count">{count}回</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;