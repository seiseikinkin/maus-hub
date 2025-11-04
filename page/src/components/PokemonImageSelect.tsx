import React, { useState, useRef, useEffect } from "react";
import "./PokemonImageSelect.css";

interface PokemonImageSelectProps {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    placeholder?: string;
}

export const PokemonImageSelect: React.FC<PokemonImageSelectProps> = ({ value, options, onChange, placeholder = "-" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ポケモン名から画像URLを生成
    const getPokemonImageUrl = (pokemonName: string): string => {
        if (!pokemonName) return "";
        const imageName = pokemonName.toLowerCase().replace(/\s+/g, "-");
        return `https://seiseikinkin.github.io/tools/image/minisprites/${imageName}.png`;
    };

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

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setIsOpen(false);
    };

    return (
        <div className="pokemon-image-select-wrapper" ref={dropdownRef}>
            <div className="pokemon-image-select-trigger" onClick={() => setIsOpen(!isOpen)}>
                {value ? (
                    <div className="pokemon-image-select-selected">
                        <img
                            src={getPokemonImageUrl(value)}
                            alt={value}
                            className="pokemon-thumbnail"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                            }}
                        />
                        <span>{value}</span>
                        <button className="clear-button" onClick={handleClear} title="クリア">
                            ×
                        </button>
                    </div>
                ) : (
                    <span className="pokemon-image-select-placeholder">{placeholder}</span>
                )}
                <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
            </div>

            {isOpen && (
                <div className="pokemon-image-select-dropdown">
                    <div className="pokemon-image-select-option empty-option" onClick={() => handleSelect("")}>
                        <span>{placeholder}</span>
                    </div>
                    {options.map((option) => (
                        <div key={option} className={`pokemon-image-select-option ${value === option ? "selected" : ""}`} onClick={() => handleSelect(option)}>
                            <img
                                src={getPokemonImageUrl(option)}
                                alt={option}
                                className="pokemon-thumbnail"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                }}
                            />
                            <span>{option}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
