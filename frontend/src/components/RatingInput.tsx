import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000'; // Backend API

interface RatingInputProps {
  filename: string;
  currentRating: number | null;
  onRatingSubmitted: (data: { filename: string; rating: number }) => void;
}

const RatingInput: React.FC<RatingInputProps> = ({ filename, currentRating, onRatingSubmitted }) => {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setRating(currentRating || 0); // Update local rating when prop changes
  }, [currentRating]);

  const handleSubmit = async (newRating: number) => {
    if (newRating < 1 || newRating > 5) return;
    setMessage('Submitting...');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename, rating: newRating }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || 'Failed to submit rating');
      }
      const result = await response.json();
      setRating(result.rating);
      setMessage('Rating submitted successfully!');
      if (onRatingSubmitted) {
        onRatingSubmitted({ filename, rating: result.rating });
      }
      setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    } catch (err: any) {
      console.error("Rating submission error:", err);
      setError(err.message || 'An error occurred.');
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center space-x-2 mb-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            key={value}
            className={`px-4 py-2 border rounded-md text-lg font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400 
                        ${value <= (hoverRating || rating)
                          ? 'bg-amber-400 text-stone-900 border-amber-500 dark:bg-amber-300 dark:text-black dark:border-amber-400' 
                          : 'bg-stone-500 text-stone-100 border-stone-600 hover:bg-stone-600 hover:border-stone-500 dark:bg-stone-600 dark:text-stone-200 dark:border-stone-700 dark:hover:bg-stone-700 dark:hover:border-stone-600'}
                      `}
            onClick={() => handleSubmit(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`Rate ${value} out of 5`}
          >
            {value}
          </button>
        ))}
      </div>
      {message && <p className="text-sm text-green-500 dark:text-green-400">{message}</p>}
      {error && <p className="text-sm text-red-500 dark:text-red-400">Error: {error}</p>}
    </div>
  );
};

export default RatingInput; 