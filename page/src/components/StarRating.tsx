import React, { useState } from 'react';

interface StarRatingProps {
    rating: number;
    onRatingChange: (rating: number) => void;
    readonly?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export const StarRating: React.FC<StarRatingProps> = ({ 
    rating, 
    onRatingChange, 
    readonly = false, 
    size = 'medium' 
}) => {
    const [hoveredRating, setHoveredRating] = useState<number>(0);

    const handleClick = (starRating: number) => {
        if (!readonly) {
            onRatingChange(starRating);
        }
    };

    const handleMouseEnter = (starRating: number) => {
        if (!readonly) {
            setHoveredRating(starRating);
        }
    };

    const handleMouseLeave = () => {
        if (!readonly) {
            setHoveredRating(0);
        }
    };

    const getStarClass = (starIndex: number) => {
        const baseClass = `star ${size}`;
        const displayRating = hoveredRating || rating;
        
        if (starIndex <= displayRating) {
            return `${baseClass} filled`;
        }
        return `${baseClass} empty`;
    };

    const getCursorStyle = () => {
        return readonly ? 'default' : 'pointer';
    };

    return (
        <div 
            className="star-rating" 
            style={{ cursor: getCursorStyle() }}
            onMouseLeave={handleMouseLeave}
        >
            {[1, 2, 3, 4, 5].map((starIndex) => (
                <span
                    key={starIndex}
                    className={getStarClass(starIndex)}
                    onClick={() => handleClick(starIndex)}
                    onMouseEnter={() => handleMouseEnter(starIndex)}
                    title={readonly ? `評価: ${rating}/5` : `${starIndex}つ星を付ける`}
                >
                    ★
                </span>
            ))}
        </div>
    );
};