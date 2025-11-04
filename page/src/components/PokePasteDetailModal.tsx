import React, { useState, useEffect } from "react";
import type { PokePasteData, SelectionMemo } from "../firebase/pokePasteService";
import { StarRating } from "./StarRating";
import { SelectionMemoSection } from "./SelectionMemoSection";
import "./PokePasteDetailModal.css";

interface PokePasteDetailModalProps {
    pokepaste: PokePasteData;
    allPokepastes: PokePasteData[];
    isOpen: boolean;
    onClose: () => void;
    onRatingChange?: (id: string, rating: number) => void;
    onMemoChange?: (id: string, memo: string) => void;
    onSelectionMemosChange?: (id: string, selectionMemos: SelectionMemo[]) => void;
}

export const PokePasteDetailModal: React.FC<PokePasteDetailModalProps> = ({
    pokepaste,
    allPokepastes,
    isOpen,
    onClose,
    onRatingChange,
    onMemoChange,
    onSelectionMemosChange,
}) => {
    const [memo, setMemo] = useState(pokepaste.memo || "");
    const [isSaving, setIsSaving] = useState(false);

    // pokepasteが変更されたらmemoを更新
    useEffect(() => {
        setMemo(pokepaste.memo || "");
    }, [pokepaste.memo]);

    if (!isOpen) return null;

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleRatingChange = (rating: number) => {
        if (onRatingChange) {
            onRatingChange(pokepaste.id, rating);
        }
    };

    const handleMemoSave = async () => {
        if (onMemoChange) {
            setIsSaving(true);
            try {
                await onMemoChange(pokepaste.id, memo);
            } catch (error) {
                console.error("Failed to save memo:", error);
                alert("メモの保存に失敗しました");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleSelectionMemosSave = async (selectionMemos: SelectionMemo[]) => {
        if (onSelectionMemosChange) {
            await onSelectionMemosChange(pokepaste.id, selectionMemos);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(pokepaste.url);
            alert("リンクをコピーしました！");
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    // ポケモン名から画像URLを生成
    const getPokemonImageUrl = (pokemonName: string): string => {
        const imageName = pokemonName.toLowerCase().replace(/\s+/g, "-");
        return `https://seiseikinkin.github.io/tools/image/minisprites/${imageName}.png`;
    };

    return (
        <div className="pokepaste-modal-overlay" onClick={onClose}>
            <div className="pokepaste-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="pokepaste-modal-header">
                    <h2>{pokepaste.title || "Untitled PokePaste"}</h2>
                    <button className="pokepaste-modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="pokepaste-modal-body">
                    {/* 基本情報 */}
                    <div className="pokepaste-modal-section">
                        <div className="pokepaste-modal-info">
                            <div className="pokepaste-modal-info-item">
                                <span className="info-label">作者:</span>
                                <span className="info-value">{pokepaste.author || "作者不明"}</span>
                            </div>
                            <div className="pokepaste-modal-info-item">
                                <span className="info-label">登録日時:</span>
                                <span className="info-value">{formatDate(pokepaste.timestamp)}</span>
                            </div>
                            <div className="pokepaste-modal-info-item">
                                <span className="info-label">URL:</span>
                                <a href={pokepaste.url} target="_blank" rel="noopener noreferrer" className="info-link">
                                    {pokepaste.url}
                                </a>
                            </div>
                            <div className="pokepaste-modal-info-item">
                                <span className="info-label">評価:</span>
                                <StarRating rating={pokepaste.rating || 0} onRatingChange={handleRatingChange} size="medium" />
                            </div>
                        </div>
                    </div>

                    {/* ポケモンチーム詳細 */}
                    {pokepaste.pokemonTeam && pokepaste.pokemonTeam.length > 0 && (
                        <div className="pokepaste-modal-section">
                            <h3>パーティ構成</h3>
                            <div className="pokemon-team-grid">
                                {pokepaste.pokemonTeam.map((pokemon, index) => (
                                    <div key={index} className="pokemon-detail-card">
                                        <div className="pokemon-detail-header">
                                            <img
                                                src={getPokemonImageUrl(pokemon.species)}
                                                alt={pokemon.species}
                                                className="pokemon-detail-sprite"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = "none";
                                                }}
                                            />
                                            <div className="pokemon-detail-name">
                                                <h4>{pokemon.species}</h4>
                                                {pokemon.nickname && <span className="pokemon-nickname">({pokemon.nickname})</span>}
                                            </div>
                                        </div>

                                        <div className="pokemon-detail-info">
                                            {pokemon.item && (
                                                <div className="pokemon-info-row">
                                                    <span className="info-icon">🎒</span>
                                                    <span className="info-text">{pokemon.item}</span>
                                                </div>
                                            )}
                                            {pokemon.ability && (
                                                <div className="pokemon-info-row">
                                                    <span className="info-icon">⚡</span>
                                                    <span className="info-text">{pokemon.ability}</span>
                                                </div>
                                            )}
                                            {pokemon.teraType && (
                                                <div className="pokemon-info-row">
                                                    <span className="info-icon">💎</span>
                                                    <span className="info-text">Tera: {pokemon.teraType}</span>
                                                </div>
                                            )}
                                            {pokemon.nature && (
                                                <div className="pokemon-info-row">
                                                    <span className="info-icon">🎭</span>
                                                    <span className="info-text">{pokemon.nature}</span>
                                                </div>
                                            )}
                                            {pokemon.level && (
                                                <div className="pokemon-info-row">
                                                    <span className="info-icon">📊</span>
                                                    <span className="info-text">Lv. {pokemon.level}</span>
                                                </div>
                                            )}

                                            {/* 努力値 */}
                                            {pokemon.evs && Object.keys(pokemon.evs).length > 0 && (
                                                <div className="pokemon-stats">
                                                    <div className="stats-label">努力値 (EVs):</div>
                                                    <div className="stats-values">
                                                        {Object.entries(pokemon.evs).map(([stat, value]) => (
                                                            <span key={stat} className="stat-item">
                                                                {stat}: {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 個体値 */}
                                            {pokemon.ivs && Object.keys(pokemon.ivs).length > 0 && (
                                                <div className="pokemon-stats">
                                                    <div className="stats-label">個体値 (IVs):</div>
                                                    <div className="stats-values">
                                                        {Object.entries(pokemon.ivs).map(([stat, value]) => (
                                                            <span key={stat} className="stat-item">
                                                                {stat}: {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 技 */}
                                            {pokemon.moves && pokemon.moves.length > 0 && (
                                                <div className="pokemon-moves">
                                                    <div className="moves-label">技:</div>
                                                    <div className="moves-list">
                                                        {pokemon.moves.map((move, moveIndex) => (
                                                            <div key={moveIndex} className="move-item">
                                                                • {move}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ポケモンリストのみの場合 */}
                    {pokepaste.pokemonNames && pokepaste.pokemonNames.length > 0 && (!pokepaste.pokemonTeam || pokepaste.pokemonTeam.length === 0) && (
                        <div className="pokepaste-modal-section">
                            <h3>ポケモンリスト</h3>
                            <div className="pokemon-simple-list">
                                {pokepaste.pokemonNames.map((name, index) => (
                                    <div key={index} className="pokemon-simple-item">
                                        <img
                                            src={getPokemonImageUrl(name)}
                                            alt={name}
                                            className="pokemon-simple-sprite"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = "none";
                                            }}
                                        />
                                        <span>{name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* メモセクション */}
                    <div className="pokepaste-modal-section">
                        <h3>チームメモ</h3>
                        <div className="memo-section">
                            <textarea
                                className="memo-textarea"
                                placeholder="チームについてのメモを入力..."
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                rows={5}
                            />
                            <button className="memo-save-button" onClick={handleMemoSave} disabled={isSaving}>
                                {isSaving ? "保存中..." : "メモを保存"}
                            </button>
                        </div>
                    </div>

                    {/* 選出メモセクション */}
                    <SelectionMemoSection currentPokepaste={pokepaste} allPokepastes={allPokepastes} onSave={handleSelectionMemosSave} />
                </div>

                <div className="pokepaste-modal-footer">
                    <button className="modal-button secondary" onClick={handleCopyLink}>
                        🔗 リンクをコピー
                    </button>
                    <button className="modal-button primary" onClick={onClose}>
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};
