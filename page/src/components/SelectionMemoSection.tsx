import React, { useState, useEffect } from "react";
import type { PokePasteData, SelectionMemo } from "../firebase/pokePasteService";
import { StarRating } from "./StarRating";
import { PokemonImageSelect } from "./PokemonImageSelect";
import { TeamImageSelect } from "./TeamImageSelect";
import "./SelectionMemoSection.css";

interface SelectionMemoSectionProps {
    currentPokepaste: PokePasteData;
    allPokepastes: PokePasteData[];
    onSave: (selectionMemos: SelectionMemo[]) => void;
    onSelectionMemosChange?: (selectionMemos: SelectionMemo[]) => void;
}

export const SelectionMemoSection: React.FC<SelectionMemoSectionProps> = ({ currentPokepaste, allPokepastes, onSave, onSelectionMemosChange }) => {
    const [selectionMemos, setSelectionMemos] = useState<SelectionMemo[]>(currentPokepaste.selectionMemos || []);
    const [isSaving, setIsSaving] = useState(false);

    // currentPokepasteが変更されたらselectionMemosをリセット
    useEffect(() => {
        setSelectionMemos(currentPokepaste.selectionMemos || []);
    }, [currentPokepaste.id, currentPokepaste.selectionMemos]);

    // selectionMemosが変更されたら親に通知
    useEffect(() => {
        if (onSelectionMemosChange) {
            onSelectionMemosChange(selectionMemos);
        }
    }, [selectionMemos, onSelectionMemosChange]);

    // 現在のチームのポケモンリストを取得
    const getCurrentTeamPokemon = (): string[] => {
        if (currentPokepaste.pokemonTeam && currentPokepaste.pokemonTeam.length > 0) {
            return currentPokepaste.pokemonTeam.map((p) => p.species);
        }
        return currentPokepaste.pokemonNames || [];
    };

    // 相手チームのポケモンリストを取得
    const getOpponentTeamPokemon = (opponentTeamId: string): string[] => {
        const opponent = allPokepastes.find((p) => p.id === opponentTeamId);
        if (!opponent) return [];
        if (opponent.pokemonTeam && opponent.pokemonTeam.length > 0) {
            return opponent.pokemonTeam.map((p) => p.species);
        }
        return opponent.pokemonNames || [];
    };

    const currentTeamPokemon = getCurrentTeamPokemon();

    // 新しい選出メモを追加
    const handleAddMemo = () => {
        const newMemo: SelectionMemo = {
            id: `selection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            opponentTeamId: "",
            selectedPokemon: ["", "", "", ""],
            opponentSelectedPokemon: ["", "", "", ""],
            memo: "",
            rating: 0,
        };
        setSelectionMemos([...selectionMemos, newMemo]);
    };

    // 選出メモを削除
    const handleDeleteMemo = (id: string) => {
        setSelectionMemos(selectionMemos.filter((memo) => memo.id !== id));
    };

    // 相手チームを変更
    const handleOpponentChange = (id: string, opponentTeamId: string) => {
        setSelectionMemos(selectionMemos.map((memo) => (memo.id === id ? { ...memo, opponentTeamId } : memo)));
    };

    // 選出ポケモンを変更
    const handlePokemonChange = (id: string, index: number, pokemon: string) => {
        setSelectionMemos(
            selectionMemos.map((memo) => {
                if (memo.id === id) {
                    const newSelected: [string, string, string, string] = [...memo.selectedPokemon] as [string, string, string, string];
                    newSelected[index] = pokemon;
                    return { ...memo, selectedPokemon: newSelected };
                }
                return memo;
            })
        );
    };

    // 相手の選出ポケモンを変更
    const handleOpponentPokemonChange = (id: string, index: number, pokemon: string) => {
        setSelectionMemos(
            selectionMemos.map((memo) => {
                if (memo.id === id) {
                    const newSelected: [string, string, string, string] = [...memo.opponentSelectedPokemon] as [string, string, string, string];
                    newSelected[index] = pokemon;
                    return { ...memo, opponentSelectedPokemon: newSelected };
                }
                return memo;
            })
        );
    };

    // メモを変更
    const handleMemoChange = (id: string, memo: string) => {
        setSelectionMemos(selectionMemos.map((m) => (m.id === id ? { ...m, memo } : m)));
    };

    // 評価を変更
    const handleRatingChange = (id: string, rating: number) => {
        setSelectionMemos(selectionMemos.map((m) => (m.id === id ? { ...m, rating } : m)));
    };

    // 保存
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(selectionMemos);
        } catch (error) {
            console.error("Failed to save selection memos:", error);
            alert("選出メモの保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="selection-memo-section">
            <div className="selection-memo-header">
                <h3>選出メモ</h3>
            </div>

            {selectionMemos.length === 0 ? (
                <p className="no-memos-message">選出メモがありません。「選出メモを追加」ボタンをクリックして追加してください。</p>
            ) : (
                <div className="selection-memos-list">
                    {selectionMemos.map((memo) => {
                        const opponentPokemon = getOpponentTeamPokemon(memo.opponentTeamId);
                        return (
                            <div key={memo.id} className="selection-memo-item">
                                {/* ヘッダー: 相手チーム選択 + 評価 + 削除 */}
                                <div className="selection-memo-header-row">
                                    <div className="opponent-select-wrapper">
                                        <label>相手チーム:</label>
                                        <TeamImageSelect
                                            value={memo.opponentTeamId}
                                            teams={allPokepastes}
                                            onChange={(teamId) => handleOpponentChange(memo.id, teamId)}
                                            currentTeamId={currentPokepaste.id}
                                        />
                                    </div>
                                    <div className="rating-wrapper">
                                        <label>評価:</label>
                                        <StarRating rating={memo.rating || 0} onRatingChange={(rating) => handleRatingChange(memo.id, rating)} size="small" />
                                    </div>
                                    <button className="delete-memo-button" onClick={() => handleDeleteMemo(memo.id)} title="削除">
                                        🗑️
                                    </button>
                                </div>

                                {/* コンテンツエリア: 左右2カラム */}
                                <div className="selection-memo-content">
                                    <div className="selection-memo-left">
                                        {/* 相手の選出想定 */}
                                        <div className="pokemon-selects-wrapper">
                                            <label>相手の選出想定 (4体):</label>
                                            <div className="pokemon-image-selects">
                                                {[0, 1, 2, 3].map((index) => (
                                                    <PokemonImageSelect
                                                        key={index}
                                                        value={memo.opponentSelectedPokemon[index]}
                                                        options={opponentPokemon}
                                                        onChange={(value) => handleOpponentPokemonChange(memo.id, index, value)}
                                                        placeholder="-"
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* 自分の選出 */}
                                        <div className="pokemon-selects-wrapper">
                                            <label>自分の選出 (4体):</label>
                                            <div className="pokemon-image-selects">
                                                {[0, 1, 2, 3].map((index) => (
                                                    <PokemonImageSelect
                                                        key={index}
                                                        value={memo.selectedPokemon[index]}
                                                        options={currentTeamPokemon}
                                                        onChange={(value) => handlePokemonChange(memo.id, index, value)}
                                                        placeholder="-"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="selection-memo-right">
                                        <label>メモ:</label>
                                        <textarea
                                            className="selection-memo-textarea"
                                            placeholder="選出についてのメモを入力..."
                                            value={memo.memo}
                                            onChange={(e) => handleMemoChange(memo.id, e.target.value)}
                                            rows={10}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="selection-memo-footer">
                <button className="add-memo-button" onClick={handleAddMemo}>
                    ＋ 選出メモを追加
                </button>
                <button className="save-selection-memos-button" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "保存中..." : "選出メモを保存"}
                </button>
            </div>
        </div>
    );
};
