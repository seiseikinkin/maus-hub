import React, { useState } from "react";
import type { PokePasteData, SelectionMemo } from "../firebase/pokePasteService";
import { StarRating } from "./StarRating";
import { PokePasteDetailModal } from "./PokePasteDetailModal";

interface PokePasteItemProps {
    pokepaste: PokePasteData;
    allPokepastes: PokePasteData[];
    onDelete: (id: string) => void;
    onRatingChange: (id: string, rating: number) => void;
    onMemoChange?: (id: string, memo: string) => void;
    onSelectionMemosChange?: (id: string, selectionMemos: SelectionMemo[]) => void;
}

export const PokePasteItem: React.FC<PokePasteItemProps> = ({ pokepaste, allPokepastes, onDelete, onRatingChange, onMemoChange, onSelectionMemosChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete && window.confirm("削除しますか？")) {
            onDelete(pokepaste.id);
        }
    };

    const handleRatingChange = (rating: number) => {
        if (onRatingChange) {
            onRatingChange(pokepaste.id, rating);
        }
    };

    const handleRowClick = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(pokepaste.url);
            // 一時的にボタンテキストを変更してコピー完了を示す
            const button = e.target as HTMLButtonElement;
            const originalText = button.textContent;
            button.textContent = "✅";
            setTimeout(() => {
                button.textContent = originalText;
            }, 1000);
        } catch (err) {
            console.error("Failed to copy link:", err);
            // フォールバック: 古いブラウザ用
            const textArea = document.createElement("textarea");
            textArea.value = pokepaste.url;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand("copy");
                const button = e.target as HTMLButtonElement;
                const originalText = button.textContent;
                button.textContent = "✅";
                setTimeout(() => {
                    button.textContent = originalText;
                }, 1000);
            } catch (fallbackErr) {
                console.error("Fallback copy failed:", fallbackErr);
                alert("リンクのコピーに失敗しました");
            }
            document.body.removeChild(textArea);
        }
    };

    // ポケモン名から画像URLを生成
    const getPokemonImageUrl = (pokemonName: string): string => {
        // 全て小文字に変換し、スペースをハイフンに置換
        const imageName = pokemonName.toLowerCase().replace(/\s+/g, "-");
        return `https://seiseikinkin.github.io/tools/image/minisprites/${imageName}.png`;
    };

    // 画像エラー時のフォールバック処理
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        const parent = target.parentElement;
        if (parent) {
            // 画像を非表示にしてフォールバックテキストを表示
            target.style.display = "none";
            const textElement = parent.querySelector(".pokemon-name-text") as HTMLElement;
            if (textElement) {
                textElement.style.display = "inline-block";
            }
        }
    };

    return (
        <>
            <div className="pokepaste-item-single-line" onClick={handleRowClick}>
                <div className="pokepaste-title-section">
                    <a href={pokepaste.url} target="_blank" rel="noopener noreferrer" className="pokepaste-title-link" onClick={(e) => e.stopPropagation()}>
                        {pokepaste.title || "Untitled PokePaste"}
                    </a>
                </div>

                <div className="pokepaste-author-section">
                    <span className="pokepaste-author">{pokepaste.author ? `by ${pokepaste.author}` : "作者不明"}</span>
                </div>

                <div className="pokepaste-pokemon-section">
                    {pokepaste.pokemonNames && pokepaste.pokemonNames.length > 0 ? (
                        <div className="pokepaste-pokemon-row">
                            {pokepaste.pokemonNames.map((name, index) => {
                                // pokemonTeamからの詳細情報を取得（存在する場合）
                                const pokemonDetails = pokepaste.pokemonTeam?.[index];
                                const tooltipText = pokemonDetails
                                    ? `${pokemonDetails.species}${pokemonDetails.nickname ? ` (${pokemonDetails.nickname})` : ""}
${pokemonDetails.item ? `@ ${pokemonDetails.item}` : ""}
${pokemonDetails.ability ? `Ability: ${pokemonDetails.ability}` : ""}
${pokemonDetails.teraType ? `Tera Type: ${pokemonDetails.teraType}` : ""}
${pokemonDetails.nature ? `Nature: ${pokemonDetails.nature}` : ""}
${pokemonDetails.moves.length > 0 ? `Moves: ${pokemonDetails.moves.join(", ")}` : ""}`
                                    : name;

                                return (
                                    <div key={index} className="pokemon-item-inline">
                                        <img
                                            src={getPokemonImageUrl(name)}
                                            alt={name}
                                            className="pokemon-sprite-inline"
                                            onError={handleImageError}
                                            title={tooltipText}
                                        />
                                        <span className="pokemon-name-text" style={{ display: "none" }}>
                                            🎮 {name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <span className="no-pokemon">ポケモンなし</span>
                    )}
                </div>

                <div className="pokepaste-rating-section" onClick={(e) => e.stopPropagation()}>
                    <StarRating rating={pokepaste.rating || 0} onRatingChange={handleRatingChange} size="small" />
                </div>

                <div className="pokepaste-date-section">
                    <span className="pokepaste-date">{formatDate(pokepaste.timestamp)}</span>
                </div>

                <div className="pokepaste-actions-section" onClick={(e) => e.stopPropagation()}>
                    <button className="copy-link-button" onClick={handleCopyLink} title="リンクをコピー">
                        🔗
                    </button>
                    {onDelete && (
                        <button className="delete-button" onClick={handleDelete} title="削除">
                            🗑️
                        </button>
                    )}
                </div>
            </div>

            <PokePasteDetailModal
                pokepaste={pokepaste}
                allPokepastes={allPokepastes}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onRatingChange={onRatingChange}
                onMemoChange={onMemoChange}
                onSelectionMemosChange={onSelectionMemosChange}
            />
        </>
    );
};
