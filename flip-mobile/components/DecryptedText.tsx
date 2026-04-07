import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Text, TextStyle } from 'react-native';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  characters?: string;
  style?: TextStyle;
  encryptedStyle?: TextStyle;
}

export default function DecryptedText({
  text,
  speed = 40,
  maxIterations = 8,
  sequential = true,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*',
  style,
  encryptedStyle,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const charList = useMemo(() => characters.split(''), [characters]);

  const shuffle = useCallback((originalText: string, revealedIndices: Set<number>) => {
    return originalText
      .split('')
      .map((char, i) => {
        if (char === ' ') return ' ';
        if (revealedIndices.has(i)) return char;
        return charList[Math.floor(Math.random() * charList.length)];
      })
      .join('');
  }, [charList]);

  const startAnimation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setIsAnimating(true);
    let iteration = 0;
    const revealedIndices = new Set<number>();
    const textLength = text.length;

    intervalRef.current = setInterval(() => {
      if (sequential) {
        // Reveal 1-2 characters per frame for that "loading" look
        if (revealedIndices.size < textLength) {
          revealedIndices.add(revealedIndices.size);
          setDisplayText(shuffle(text, revealedIndices));
        } else {
          stopAnimation();
        }
      } else {
        // Scramble everything for a set number of iterations
        if (iteration < maxIterations) {
          setDisplayText(shuffle(text, revealedIndices));
          iteration++;
        } else {
          stopAnimation();
        }
      }
    }, speed);
  }, [text, speed, maxIterations, sequential, shuffle]);

  const stopAnimation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayText(text);
    setIsAnimating(false);
  };

  // Trigger animation whenever the text (price) changes
  useEffect(() => {
    startAnimation();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [text]);

  return (
    <Text style={[style, isAnimating && encryptedStyle]}>
      {displayText}
    </Text>
  );
}