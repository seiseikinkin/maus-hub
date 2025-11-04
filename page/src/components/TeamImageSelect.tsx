import React, { useState, useRef, useEffect } from "react";
import type { PokePasteData } from "../firebase/pokePasteService";
import "./TeamImageSelect.css";

interface TeamImageSelectProps {
    value: string;
    teams: PokePasteData[];
    onChange: (teamId: string) => void;
    currentTeamId: string; // 現在のチームIDを除外するため
}

export const TeamImageSelect: React.FC<TeamImageSelectProps> = ({ value, teams, onChange, currentTeamId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ポケモン名から画像URLを生成
    const getPokemonImageUrl = (pokemonName: string): string => {
        if (!pokemonName) return "";
        const imageName = pokemonName.toLowerCase().replace(/\s+/g, "-");
        return `https://seiseikinkin.github.io/tools/image/minisprites/${imageName}.png`;
    };

    // チームのポケモンリストを取得
    const getTeamPokemon = (team: PokePasteData): string[] => {
        if (team.pokemonTeam && team.pokemonTeam.length > 0) {
            return team.pokemonTeam.map((p) => p.species);
        }
        return team.pokemonNames || [];
    };

    // 選択中のチームを取得
    const selectedTeam = teams.find((team) => team.id === value);

    // 外側クリックでドロップダウンを閉じる
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (teamId: string) => {
        onChange(teamId);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setIsOpen(false);
    };

    // 現在のチーム以外のチームをフィルタリング
    const availableTeams = teams.filter((team) => team.id !== currentTeamId);

    return (
        <div className="team-image-select-wrapper" ref={dropdownRef}>
            <div className="team-image-select-trigger" onClick={() => setIsOpen(!isOpen)}>
                {selectedTeam ? (
                    <div className="team-image-select-selected">
                        <div className="team-pokemon-preview">
                            {getTeamPokemon(selectedTeam)
                                .slice(0, 6)
                                .map((pokemon, idx) => (
                                    <img
                                        key={idx}
                                        src={getPokemonImageUrl(pokemon)}
                                        alt={pokemon}
                                        className="pokemon-mini-sprite"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = "none";
                                        }}
                                    />
                                ))}
                        </div>
                        <span className="team-title">{selectedTeam.title || "Untitled"}</span>
                        <button className="clear-button" onClick={handleClear} title="クリア">
                            ×
                        </button>
                    </div>
                ) : (
                    <span className="team-image-select-placeholder">選択してください</span>
                )}
                <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
            </div>

            {isOpen && (
                <div className="team-image-select-dropdown">
                    <div className="team-image-select-option empty-option" onClick={() => handleSelect("")}>
                        <span>選択してください</span>
                    </div>
                    {availableTeams.map((team) => {
                        const teamPokemon = getTeamPokemon(team);
                        return (
                            <div
                                key={team.id}
                                className={`team-image-select-option ${value === team.id ? "selected" : ""}`}
                                onClick={() => handleSelect(team.id)}
                            >
                                <div className="team-option-content">
                                    <div className="team-option-pokemon">
                                        {teamPokemon.slice(0, 6).map((pokemon, idx) => (
                                            <img
                                                key={idx}
                                                src={getPokemonImageUrl(pokemon)}
                                                alt={pokemon}
                                                className="pokemon-mini-sprite"
                                                title={pokemon}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = "none";
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span className="team-option-title">{team.title || "Untitled"}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
