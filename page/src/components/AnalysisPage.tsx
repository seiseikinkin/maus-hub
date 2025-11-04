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
import { pokePasteService } from '../firebase/pokePasteService';
import type { PokePasteData } from '../firebase/pokePasteService';
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

// チーム名生成ヘルパー関数
const getTeamDisplayName = (pokemon: string[]): string => {
    if (pokemon.length === 0) return 'チーム未設定';
    if (pokemon.length <= 3) {
        return pokemon.join(', ');
    }
    return `${pokemon.slice(0, 3).join(', ')} 他${pokemon.length - 3}匹`;
};

// カスタムチームドロップダウンコンポーネント
const TeamDropdown: React.FC<{
    selectedTeamId: string;
    teams: Array<{id: string, pokemon: string[], count: number}>;
    onSelect: (teamId: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}> = ({ selectedTeamId, teams, onSelect, isOpen, onToggle }) => {
    const selectedTeam = teams.find(team => team.id === selectedTeamId);
    
    const handleSelect = (teamId: string) => {
        onSelect(teamId);
        onToggle(); // ドロップダウンを閉じる
    };

    return (
        <div className="custom-team-dropdown">
            <div className="team-dropdown-trigger" onClick={onToggle}>
                <div className="selected-team-preview">
                    {selectedTeamId === 'all' ? (
                        <span className="all-teams-text">全チーム</span>
                    ) : selectedTeam ? (
                        <>
                            <div className="team-pokemon-preview">
                                {selectedTeam.pokemon.slice(0, 6).map((pokemon, index) => (
                                    <PokemonImage 
                                        key={`${selectedTeamId}-preview-${index}-${pokemon}`} 
                                        pokemonName={pokemon} 
                                        className="dropdown-pokemon-mini"
                                    />
                                ))}
                            </div>
                            <span className="team-usage-count">({selectedTeam.count}回)</span>
                        </>
                    ) : (
                        <span className="all-teams-text">チーム選択</span>
                    )}
                </div>
                <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</div>
            </div>
            
            {isOpen && (
                <div className="team-dropdown-menu">
                    <div 
                        className={`team-dropdown-item ${selectedTeamId === 'all' ? 'selected' : ''}`}
                        onClick={() => handleSelect('all')}
                    >
                        <span className="all-teams-option">全チーム</span>
                    </div>
                    {teams.map(team => (
                        <div 
                            key={team.id}
                            className={`team-dropdown-item ${selectedTeamId === team.id ? 'selected' : ''}`}
                            onClick={() => handleSelect(team.id)}
                        >
                            <div className="team-pokemon-row">
                                {team.pokemon.slice(0, 6).map((pokemon, index) => (
                                    <PokemonImage 
                                        key={`${team.id}-dropdown-${index}-${pokemon}`} 
                                        pokemonName={pokemon} 
                                        className="dropdown-pokemon"
                                    />
                                ))}
                            </div>
                            <span className="team-usage-info">{team.count}回使用</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ポケモン画像コンポーネント
const PokemonImage: React.FC<{ pokemonName: string; className?: string }> = ({ pokemonName, className = '' }) => {
    const [imageSrc, setImageSrc] = useState(getPokemonImageUrl(pokemonName));
    const [hasError, setHasError] = useState(false);

    // pokemonNameが変更された時に状態をリセット
    useEffect(() => {
        setImageSrc(getPokemonImageUrl(pokemonName));
        setHasError(false);
    }, [pokemonName]);

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
    const [allReplaysData, setAllReplaysData] = useState<RatingData[]>([]); // 選出分析用の全リプレイデータ
    const [loading, setLoading] = useState(true);
    const [selectedFormat, setSelectedFormat] = useState<string>('all');
    const [availableFormats, setAvailableFormats] = useState<string[]>([]);
    const [currentPlayerNames, setCurrentPlayerNames] = useState<string[]>([]);
    const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
    const [availableTeams, setAvailableTeams] = useState<Array<{id: string, pokemon: string[], count: number}>>([]);
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    
    // PokePaste関連の状態
    const [pokePastes, setPokePastes] = useState<PokePasteData[]>([]);
    const [matchedPokePaste, setMatchedPokePaste] = useState<PokePasteData | null>(null);

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

    // チームとPokePasteをマッチングする関数
    const findMatchingPokePaste = useCallback((teamPokemon: string[]) => {
        if (!pokePastes.length || !teamPokemon.length) return null;
        
        // チームのポケモンリストを正規化（ソート）
        const sortedTeamPokemon = [...teamPokemon].sort();
        
        // 完全一致するPokePasteを探す
        const exactMatch = pokePastes.find(pokePaste => {
            if (!pokePaste.pokemonNames || pokePaste.pokemonNames.length === 0) return false;
            
            const sortedPokePastePokemon = [...pokePaste.pokemonNames].sort();
            
            // 長さが違う場合は一致しない
            if (sortedTeamPokemon.length !== sortedPokePastePokemon.length) return false;
            
            // すべてのポケモンが一致するかチェック
            return sortedTeamPokemon.every((pokemon, index) => 
                pokemon.toLowerCase() === sortedPokePastePokemon[index].toLowerCase()
            );
        });
        
        return exactMatch || null;
    }, [pokePastes]);

    const loadRatingData = useCallback(async () => {
        if (!user) return;
        
        setLoading(true);
        try {
            // ユーザー設定とリプレイデータを並行して取得
            const [userSettings, replays, userPokePastes] = await Promise.all([
                settingsService.getUserSettings(user.uid),
                replayService.getReplaysByUser(user.uid, 200),
                pokePasteService.getPokePastesByUser(user.uid, 1000)
            ]);

            const playerNames = settingsService.getPlayerNames(userSettings);
            setPokePastes(userPokePastes);
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

            // 選出分析用に全リプレイデータを処理（レーティングなしも含む）
            const allValidReplays = replays
                .filter((replay: ReplayData) => {
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

            const allReplaysDataArray: RatingData[] = allValidReplays.map((replay: ReplayData) => {
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
                    rating: replay.rating || 0, // レーティングなしの場合は0
                    replayUrl: replay.url,
                    players: replay.players,
                    format: replay.format,
                    teams: replay.teams || {},
                    selectedPokemon: replay.selectedPokemon || {},
                    winStatus: winStatus,
                    playerName: playerNames[0] || ''  // 表示用には最初の名前を使用
                };
            });

            setAllReplaysData(allReplaysDataArray);

            // 利用可能なフォーマットを抽出（全リプレイデータから）
            const formats = [...new Set(allReplaysDataArray.map(data => data.format))];
            setAvailableFormats(formats);

            // 自分が使用したチーム（6匹の組み合わせ）を抽出
            const teamCombinations = new Map<string, {pokemon: string[], count: number}>();
            
            ratingDataArray.forEach(data => {
                // 自分のチームを取得
                const myPlayer = playerNames.find(playerName => 
                    data.players.includes(playerName)
                );
                
                if (myPlayer && data.teams[myPlayer]) {
                    const myTeam = data.teams[myPlayer].slice(0, 6); // 元の順序を保持
                    if (myTeam.length === 6) {
                        // ソートしたキーで同じチーム構成を認識するが、表示用には元の順序を保持
                        const teamKey = [...myTeam].sort().join('|');
                        if (teamCombinations.has(teamKey)) {
                            teamCombinations.get(teamKey)!.count++;
                        } else {
                            teamCombinations.set(teamKey, {
                                pokemon: myTeam, // 元の順序で保存
                                count: 1
                            });
                        }
                    }
                }
            });

            // チーム使用頻度順にソート
            const sortedTeams = Array.from(teamCombinations.entries())
                .map(([key, value], index) => ({
                    id: key,
                    pokemon: value.pokemon,
                    count: value.count
                }))
                .sort((a, b) => b.count - a.count);

            setAvailableTeams(sortedTeams);

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

    // 選択されたチームのPokePasteマッチングを実行
    useEffect(() => {
        if (selectedTeamFilter !== 'all' && pokePastes.length > 0) {
            const selectedTeam = availableTeams.find(team => team.id === selectedTeamFilter);
            if (selectedTeam) {
                const matched = findMatchingPokePaste(selectedTeam.pokemon);
                setMatchedPokePaste(matched);
            }
        } else {
            setMatchedPokePaste(null);
        }
    }, [selectedTeamFilter, pokePastes, availableTeams, findMatchingPokePaste]);

    // ドロップダウンの外側クリックで閉じる
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.custom-team-dropdown')) {
                setIsTeamDropdownOpen(false);
            }
        };

        if (isTeamDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isTeamDropdownOpen]);

    // フィルターを適用したデータ（レーティングあり）
    const filteredRatingData = ratingData.filter(data => {
        // フォーマットフィルター
        if (selectedFormat !== 'all' && data.format !== selectedFormat) {
            return false;
        }
        
        // チームフィルター
        if (selectedTeamFilter !== 'all') {
            const myPlayer = currentPlayerNames.find(playerName => 
                data.players.includes(playerName)
            );
            
            if (myPlayer && data.teams[myPlayer]) {
                // ソートしたキーで比較（チーム構成の一致判定）
                const myTeamKey = [...data.teams[myPlayer].slice(0, 6)].sort().join('|');
                if (myTeamKey !== selectedTeamFilter) {
                    return false;
                }
            } else {
                return false;
            }
        }
        
        return true;
    });

    // フィルターを適用したデータ（全リプレイ - 選出分析用）
    const filteredAllReplaysData = allReplaysData.filter(data => {
        // フォーマットフィルター
        if (selectedFormat !== 'all' && data.format !== selectedFormat) {
            return false;
        }
        
        // チームフィルター
        if (selectedTeamFilter !== 'all') {
            const myPlayer = currentPlayerNames.find(playerName => 
                data.players.includes(playerName)
            );
            
            if (myPlayer && data.teams[myPlayer]) {
                // ソートしたキーで比較（チーム構成の一致判定）
                const myTeamKey = [...data.teams[myPlayer].slice(0, 6)].sort().join('|');
                if (myTeamKey !== selectedTeamFilter) {
                    return false;
                }
            } else {
                return false;
            }
        }
        
        return true;
    });

    // グラフ用データ（時系列順：古いものから新しいものへ）
    const chartRatingData = [...filteredRatingData].reverse();

    // フィルター後のデータで相手の傾向分析を再計算
    const filteredOpponentTrends = React.useMemo(() => {
        const winData = filteredRatingData.filter(data => data.winStatus === 'win');
        const lossData = filteredRatingData.filter(data => data.winStatus === 'loss');

        const analyzeOpponentTrends = (data: RatingData[]) => {
            const pokemonCount: Record<string, number> = {};
            const teams: string[][] = [];

            data.forEach(replay => {
                // 相手のチーム（自分以外のプレイヤー）
                const opponentPlayers = replay.players.filter(player => 
                    !currentPlayerNames.includes(player)
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

        return {
            winAgainst: analyzeOpponentTrends(winData),
            lossAgainst: analyzeOpponentTrends(lossData)
        };
    }, [filteredRatingData, currentPlayerNames]);

    // 相手の選出組み合わせ分析（全リプレイデータを使用）
    const opponentSelectionAnalysis = React.useMemo(() => {
        const combinationStats: Record<string, {
            total: number;
            wins: number;
            losses: number;
            winRate: number;
            pokemon: [string, string];
        }> = {};

        filteredAllReplaysData.forEach(replay => {
            // 相手プレイヤーを特定
            const opponentPlayer = replay.players.find(player => 
                !currentPlayerNames.includes(player)
            );

            if (opponentPlayer && replay.selectedPokemon[opponentPlayer]) {
                const opponentSelected = replay.selectedPokemon[opponentPlayer];
                
                // 1番目と2番目のポケモンがいる場合
                if (opponentSelected.length >= 2) {
                    const first = opponentSelected[0];
                    const second = opponentSelected[1];
                    const combinationKey = `${first}|${second}`;

                    if (!combinationStats[combinationKey]) {
                        combinationStats[combinationKey] = {
                            total: 0,
                            wins: 0,
                            losses: 0,
                            winRate: 0,
                            pokemon: [first, second]
                        };
                    }

                    combinationStats[combinationKey].total++;
                    
                    if (replay.winStatus === 'win') {
                        combinationStats[combinationKey].losses++; // 相手視点では負け
                    } else if (replay.winStatus === 'loss') {
                        combinationStats[combinationKey].wins++; // 相手視点では勝ち
                    }
                }
            }
        });

        // 勝率を計算
        Object.values(combinationStats).forEach(stat => {
            const decidedGames = stat.wins + stat.losses;
            stat.winRate = decidedGames > 0 ? Math.round((stat.wins / decidedGames) * 100) : 0;
        });

        // 出現回数順にソート（最低3回以上出現したもののみ）
        return Object.entries(combinationStats)
            .filter(([, stat]) => stat.total >= 3)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 15); // 上位15組み合わせ
    }, [filteredAllReplaysData, currentPlayerNames]);

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
                text: (() => {
                    let title = 'レーティング推移';
                    const filters = [];
                    
                    if (selectedFormat !== 'all') {
                        filters.push(selectedFormat);
                    }
                    
                    if (selectedTeamFilter !== 'all') {
                        const selectedTeam = availableTeams.find(team => team.id === selectedTeamFilter);
                        if (selectedTeam) {
                            filters.push(`${getTeamDisplayName(selectedTeam.pokemon)}`);
                        }
                    }
                    
                    if (filters.length > 0) {
                        title += `（${filters.join(' - ')}）`;
                    } else {
                        title += '（全データ）';
                    }
                    
                    return title;
                })(),
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
                <div className="filter-controls">
                    
                    <div className="filter-group">
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
                    
                    <div className="filter-group">
                        <label htmlFor="team-filter">使用チーム:</label>
                        <TeamDropdown
                            selectedTeamId={selectedTeamFilter}
                            teams={availableTeams}
                            onSelect={setSelectedTeamFilter}
                            isOpen={isTeamDropdownOpen}
                            onToggle={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                        />
                    </div>
                </div>
            </div>

            {/* 選択中のチーム表示 */}
            {selectedTeamFilter !== 'all' && (
                <div className="selected-team-display">
                    <h3>選択中のチーム</h3>
                    <div className="team-pokemon-display">
                        {availableTeams
                            .find(team => team.id === selectedTeamFilter)
                            ?.pokemon.map((pokemon, index) => (
                                <div key={`${selectedTeamFilter}-selected-${index}-${pokemon}`} className="team-pokemon-item">
                                    <PokemonImage 
                                        key={`${selectedTeamFilter}-filter-${index}-${pokemon}`}
                                        pokemonName={pokemon} 
                                        className="team-filter-pokemon" 
                                    />
                                    <span className="pokemon-name-small">{pokemon}</span>
                                </div>
                            ))
                        }
                    </div>
                    
                    {/* PokePasteマッチング情報 */}
                    {matchedPokePaste ? (
                        <div className="matched-pokepaste">
                            <div className="pokepaste-info">
                                <span className="pokepaste-label">📋 登録済みチーム:</span>
                                <a 
                                    href={matchedPokePaste.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="pokepaste-link"
                                >
                                    {matchedPokePaste.title}
                                </a>
                            </div>
                        </div>
                    ) : pokePastes.length > 0 ? (
                        <div className="no-pokepaste-match">
                            <span className="no-match-label">このチームは未登録です</span>
                        </div>
                    ) : null}
                    
                    {/* デバッグ情報 */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        フィルターID: {selectedTeamFilter}
                    </div>
                </div>
            )}

            <div className="stats-overview">
                <div className="stat-card">
                    <h3>最高レーティング</h3>
                    <div className="stat-value">
                        {filteredRatingData.length > 0 ? Math.max(...filteredRatingData.map(d => d.rating)) : stats.highestRating}
                    </div>
                </div>
                <div className="stat-card">
                    <h3>対戦数</h3>
                    <div className="stat-value">{filteredRatingData.length}</div>
                </div>
                <div className="stat-card">
                    <h3>勝利数</h3>
                    <div className="stat-value positive">
                        {filteredRatingData.filter(d => d.winStatus === 'win').length}
                    </div>
                </div>
                <div className="stat-card">
                    <h3>敗北数</h3>
                    <div className="stat-value negative">
                        {filteredRatingData.filter(d => d.winStatus === 'loss').length}
                    </div>
                </div>
                <div className="stat-card">
                    <h3>勝率</h3>
                    <div className="stat-value">
                        {filteredRatingData.length > 0 
                            ? Math.round((filteredRatingData.filter(d => d.winStatus === 'win').length / filteredRatingData.length) * 100)
                            : stats.winRate
                        }%
                    </div>
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
                            
                            const myPlayer = myPlayerIndex >= 0 ? data.players[myPlayerIndex] : null;
                            const opponentPlayer = data.players[opponentPlayerIndex] || null;
                            
                            const myTeam = myPlayer ? (data.teams[myPlayer] || []) : [];
                            const opponentTeam = opponentPlayer ? (data.teams[opponentPlayer] || []) : [];
                            const mySelectedPokemon = myPlayer ? (data.selectedPokemon[myPlayer] || []) : [];
                            const opponentSelectedPokemon = opponentPlayer ? (data.selectedPokemon[opponentPlayer] || []) : [];

                            return (
                                <tr 
                                    key={`${data.replayUrl}-${index}`} 
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
                                            <div className="pokemon-grid" title={`自分のチーム: ${myTeam.join(', ')}`}>
                                                {myTeam.slice(0, 6).map((pokemon, pokemonIndex) => (
                                                    <PokemonImage 
                                                        key={pokemonIndex} 
                                                        pokemonName={pokemon} 
                                                        className="team-pokemon"
                                                    />
                                                ))}
                                            </div>
                                            <div className="vs-divider-inline">VS</div>
                                            <div className="pokemon-grid" title={`相手のチーム: ${opponentTeam.join(', ')}`}>
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

            {/* 相手の選出組み合わせ分析セクション */}
            <div className="opponent-selection-analysis-section">
                <h2>相手の選出組み合わせ分析
                    {(selectedFormat !== 'all' || selectedTeamFilter !== 'all') && (
                        <span className="filter-applied-indicator">（フィルター適用中）</span>
                    )}
                </h2>
                <p className="section-description">
                    相手が選出した1番目と2番目のポケモンの組み合わせと、その組み合わせに対する勝率を表示します<br />
                    <strong>※ レーティングなしのリプレイも含む全リプレイデータを分析対象としています</strong>（3回以上出現した組み合わせのみ）
                </p>
                
                <div className="selection-combinations-grid">
                    {opponentSelectionAnalysis.length > 0 ? (
                        opponentSelectionAnalysis.map(([combinationKey, stat]) => (
                            <div key={combinationKey} className="combination-card">
                                <div className="combination-pokemon">
                                    <div className="pokemon-pair">
                                        <div className="pokemon-with-label">
                                            <PokemonImage 
                                                pokemonName={stat.pokemon[0]} 
                                                className="combination-pokemon-image"
                                            />
                                            <span className="pokemon-position">1番目</span>
                                            <span className="pokemon-name-small">{stat.pokemon[0]}</span>
                                        </div>
                                        <div className="combination-plus">+</div>
                                        <div className="pokemon-with-label">
                                            <PokemonImage 
                                                pokemonName={stat.pokemon[1]} 
                                                className="combination-pokemon-image"
                                            />
                                            <span className="pokemon-position">2番目</span>
                                            <span className="pokemon-name-small">{stat.pokemon[1]}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="combination-stats">
                                    <div className="stat-row">
                                        <span className="stat-label">出現回数:</span>
                                        <span className="stat-value">{stat.total}回</span>
                                    </div>
                                    <div className="stat-row">
                                        <span className="stat-label">相手の勝率:</span>
                                        <span className={`stat-value winrate ${stat.winRate >= 60 ? 'high' : stat.winRate <= 40 ? 'low' : 'medium'}`}>
                                            {stat.winRate}%
                                        </span>
                                    </div>
                                    <div className="stat-row small">
                                        <span className="stat-label">勝-敗:</span>
                                        <span className="stat-value">{stat.wins}-{stat.losses}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-selection-data">
                            <p>選出データが不足しています</p>
                            <p>3回以上出現した組み合わせがありません</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 相手の傾向分析セクション */}
            <div className="opponent-trends-section">
                <h2>相手の傾向分析
                    {(selectedFormat !== 'all' || selectedTeamFilter !== 'all') && (
                        <span className="filter-applied-indicator">（フィルター適用中）</span>
                    )}
                </h2>
                
                <div className="trends-container">
                    {/* 勝った相手の傾向 */}
                    <div className="trend-section win-trends">
                        <h3>勝利した相手の傾向</h3>
                        <div className="trend-content">
                            <div className="pokemon-frequency">
                                <h4>よく見たポケモン（上位10匹）</h4>
                                <div className="pokemon-list">
                                    {Object.entries(filteredOpponentTrends.winAgainst.pokemon)
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 10)
                                        .map(([pokemon, count]) => (
                                            <div key={`win-${pokemon}`} className="pokemon-frequency-item">
                                                <PokemonImage pokemonName={pokemon} className="frequency-pokemon" />
                                                <span className="pokemon-name">{pokemon}</span>
                                                <span className="frequency-count">{count}回</span>
                                            </div>
                                        ))
                                    }
                                </div>
                                {Object.keys(filteredOpponentTrends.winAgainst.pokemon).length === 0 && (
                                    <p className="no-trend-data">該当するデータがありません</p>
                                )}
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
                                    {Object.entries(filteredOpponentTrends.lossAgainst.pokemon)
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 10)
                                        .map(([pokemon, count]) => (
                                            <div key={`loss-${pokemon}`} className="pokemon-frequency-item">
                                                <PokemonImage pokemonName={pokemon} className="frequency-pokemon" />
                                                <span className="pokemon-name">{pokemon}</span>
                                                <span className="frequency-count">{count}回</span>
                                            </div>
                                        ))
                                    }
                                </div>
                                {Object.keys(filteredOpponentTrends.lossAgainst.pokemon).length === 0 && (
                                    <p className="no-trend-data">該当するデータがありません</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;