import { Section } from '../types';

/**
 * Utilities for Smart Parsing exam answer keys & response sheets
 * Supports formats like:
 * - "1.1, 2.C, 3.2, 4.1" (numeric options 1=A, 2=B, 3=C, 4=D)
 * - "1 a 2 b 3 c 4 d"
 * - "1:A 2:B 3:C"
 * - "1-A 2-B 3-C"
 * - "1) A 2) B 3) C"
 * - "Q1. A, Q2. B"
 * - Tab/newline separated tables
 * - Multi-section answer keys with numbering reset (e.g. Sec 1: 1-15, Sec 2 / Narration: 1-20)
 * - Raw letter sequences "ABCDAC"
 */

export function normalizeOptionLetter(val: string): string | null {
  if (!val) return null;
  const trimmed = val.trim().toUpperCase();
  
  // Standard A-J letters
  if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(trimmed)) {
    return trimmed;
  }
  
  // Numeric options 1-8 mapped to A-H
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= 8) {
    return String.fromCharCode(64 + num); // 1 -> A, 2 -> B, etc.
  }
  
  return null;
}

export interface ParsedPair {
  question: number;
  answer: string;
}

interface RawExtractedPair {
  qNum: number;
  letter: string;
  textIndex: number;
}

/**
 * Parses raw text input into a map of absoluteQuestionNumber -> optionLetter.
 * Supports:
 * - Automatic multi-section detection (when question numbers restart from 1 or drop)
 * - Targeted section parsing when targetSectionId is passed
 * - Continuous global question numbers (1 to totalQ)
 */
export function parseAnswersText(
  text: string, 
  maxQuestions?: number,
  sections?: Section[],
  targetSectionId?: string
): Record<number, string> {
  const result: Record<number, string> = {};
  if (!text || !text.trim()) return result;

  const cleanText = text.trim();
  const rawPairs: RawExtractedPair[] = [];

  // Strategy 1: Look for question-answer pairs:
  // Examples:
  // "1.1", "2.C", "3.2", "4.1"
  // "1 a", "2 b", "3 c"
  // "1:A", "1-A", "1) A", "1=A"
  // "Q1. A", "Q.1: C"
  // "(1) A", "[1] B"
  const pairRegex = /(?:^|[\s,;|\n\r]+)(?:(?:Q|QUE|QUESTION)\.?\s*)?\(?(\d{1,4})\)?\s*[:.\-=)\s]\s*\(?([A-Ja-j1-8])\)?(?![0-9A-Za-z])/g;

  let match;
  while ((match = pairRegex.exec(cleanText)) !== null) {
    const qNum = parseInt(match[1], 10);
    const rawAns = match[2];
    const letter = normalizeOptionLetter(rawAns);

    if (letter && qNum >= 1) {
      rawPairs.push({
        qNum,
        letter,
        textIndex: match.index,
      });
    }
  }

  // Strategy 2: If no pairs found via regex, check line-by-line format
  if (rawPairs.length === 0) {
    const lines = cleanText.split(/[\n\r]+/);
    let charOffset = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        const lineMatch = trimmedLine.match(/^(?:(?:Q|QUE)\.?\s*)?(\d{1,4})[\s.:\-)\t]+([A-Ja-j1-8])(?:\b|\s|$)/i);
        if (lineMatch) {
          const qNum = parseInt(lineMatch[1], 10);
          const letter = normalizeOptionLetter(lineMatch[2]);
          if (letter && qNum >= 1) {
            rawPairs.push({
              qNum,
              letter,
              textIndex: charOffset,
            });
          }
        }
      }
      charOffset += line.length + 1;
    }
  }

  // If we found pairs using Strategy 1 or Strategy 2, map them intelligently
  if (rawPairs.length > 0) {
    // Case 1: Specific target section is selected
    if (targetSectionId && targetSectionId !== 'all' && sections && sections.length > 0) {
      const targetSec = sections.find(s => s.id === targetSectionId);
      if (targetSec) {
        for (let idx = 0; idx < rawPairs.length; idx++) {
          const pair = rawPairs[idx];
          let absIndex: number;
          if (pair.qNum >= 1 && pair.qNum <= targetSec.count) {
            absIndex = targetSec.startIdx + pair.qNum - 1;
          } else if (pair.qNum >= targetSec.startIdx && pair.qNum < targetSec.startIdx + targetSec.count) {
            absIndex = pair.qNum;
          } else {
            absIndex = targetSec.startIdx + (idx % targetSec.count);
          }

          if (absIndex >= 1 && (!maxQuestions || absIndex <= maxQuestions)) {
            result[absIndex] = pair.letter;
          }
        }
        return result;
      }
    }

    // Case 2: Multi-section auto-routing with defined sections
    if (sections && sections.length > 1) {
      let secIdx = 0;
      let curSec = sections[secIdx];
      let lastQNum = -1;
      let countInSec = 0;
      let secIsRelative: boolean | null = null;

      for (let i = 0; i < rawPairs.length; i++) {
        const pair = rawPairs[i];

        // Determine if we should transition to the next section
        let shouldAdvance = false;
        if (secIdx < sections.length - 1) {
          const nextSec = sections[secIdx + 1];

          // 1. Question number restart / drop (e.g. was 15, now 1, 2, etc.)
          if (lastQNum > 0 && pair.qNum < lastQNum && pair.qNum <= 5) {
            shouldAdvance = true;
          }
          // 2. Current section's full quota was met and question number drops
          else if (countInSec >= curSec.count && pair.qNum < lastQNum) {
            shouldAdvance = true;
          }
          // 3. Question number jumps directly into the next section's global range
          else if (pair.qNum >= nextSec.startIdx && pair.qNum < nextSec.startIdx + nextSec.count && (lastQNum < nextSec.startIdx || secIsRelative === true && pair.qNum > curSec.count)) {
            shouldAdvance = true;
          }
          // 4. Check if text between previous match and this match contains section name/heading
          else if (i > 0) {
            const textBetween = cleanText.substring(rawPairs[i - 1].textIndex, pair.textIndex).toUpperCase();
            const nextName = nextSec.name.trim().toUpperCase();
            if (
              (nextName && textBetween.includes(nextName)) ||
              textBetween.includes('SECTION') ||
              textBetween.includes('PART') ||
              textBetween.includes('SEC ') ||
              textBetween.includes('SEC-')
            ) {
              if (pair.qNum <= 5 || pair.qNum === nextSec.startIdx) {
                shouldAdvance = true;
              }
            }
          }
        }

        if (shouldAdvance) {
          secIdx++;
          curSec = sections[secIdx];
          lastQNum = -1;
          countInSec = 0;
          secIsRelative = null;
        }

        // Determine if current section is using relative numbering (1..count) or absolute (startIdx..endIdx)
        if (secIsRelative === null) {
          if (curSec.startIdx > 1 && pair.qNum >= curSec.startIdx && pair.qNum < curSec.startIdx + curSec.count) {
            // Started with absolute number (e.g. Q16..Q35 for Section 2)
            secIsRelative = false;
          } else {
            // Started with relative number (e.g. Q1..Q20 for Section 2)
            secIsRelative = true;
          }
        }

        // Calculate absolute question index for curSec
        let absIndex: number;
        if (secIsRelative) {
          // Relative to section (1 -> curSec.startIdx, 20 -> curSec.startIdx + 19)
          if (pair.qNum >= 1 && pair.qNum <= curSec.count) {
            absIndex = curSec.startIdx + pair.qNum - 1;
          } else {
            absIndex = curSec.startIdx + countInSec;
          }
        } else {
          // Absolute numbering in text
          if (pair.qNum >= curSec.startIdx && pair.qNum < curSec.startIdx + curSec.count) {
            absIndex = pair.qNum;
          } else {
            absIndex = curSec.startIdx + countInSec;
          }
        }

        if (absIndex >= 1 && (!maxQuestions || absIndex <= maxQuestions)) {
          result[absIndex] = pair.letter;
          lastQNum = pair.qNum;
          countInSec++;
        }
      }

      return result;
    }

    // Case 3: Single section or no sections array, but numbers might restart from 1
    let globalOffset = 0;
    let lastSeenQ = -1;

    for (const pair of rawPairs) {
      if (lastSeenQ > 0 && pair.qNum <= lastSeenQ && pair.qNum <= 5) {
        // Question number restarted (e.g. 15 followed by 1)
        globalOffset += lastSeenQ;
        lastSeenQ = -1;
      }

      const absIndex = globalOffset + pair.qNum;
      if (absIndex >= 1 && (!maxQuestions || absIndex <= maxQuestions)) {
        result[absIndex] = pair.letter;
        lastSeenQ = pair.qNum;
      }
    }

    return result;
  }

  // Strategy 3: Check sequence of separated tokens e.g. "A B C D" or "1 2 3 4" or "A, B, C, D"
  const tokens = cleanText.split(/[\s,;\n\r\t]+/).filter(Boolean);
  let allTokensValid = tokens.length > 0;
  const tokenAnswers: string[] = [];

  for (const t of tokens) {
    const opt = normalizeOptionLetter(t);
    if (opt) {
      tokenAnswers.push(opt);
    } else {
      allTokensValid = false;
      break;
    }
  }

  if (allTokensValid && tokenAnswers.length > 0) {
    if (targetSectionId && targetSectionId !== 'all' && sections) {
      const targetSec = sections.find(s => s.id === targetSectionId);
      if (targetSec) {
        const limit = Math.min(tokenAnswers.length, targetSec.count);
        for (let i = 0; i < limit; i++) {
          const absIndex = targetSec.startIdx + i;
          if (!maxQuestions || absIndex <= maxQuestions) {
            result[absIndex] = tokenAnswers[i];
          }
        }
        return result;
      }
    }

    const limit = maxQuestions ? Math.min(tokenAnswers.length, maxQuestions) : tokenAnswers.length;
    for (let i = 0; i < limit; i++) {
      result[i + 1] = tokenAnswers[i];
    }
    return result;
  }

  // Strategy 4: Raw continuous letters string e.g. "ABCDABCD"
  const lettersOnly = cleanText.toUpperCase().replace(/[^A-J]/g, '');
  if (lettersOnly.length > 0) {
    if (targetSectionId && targetSectionId !== 'all' && sections) {
      const targetSec = sections.find(s => s.id === targetSectionId);
      if (targetSec) {
        const limit = Math.min(lettersOnly.length, targetSec.count);
        for (let i = 0; i < limit; i++) {
          const absIndex = targetSec.startIdx + i;
          if (!maxQuestions || absIndex <= maxQuestions) {
            result[absIndex] = lettersOnly[i];
          }
        }
        return result;
      }
    }

    const limit = maxQuestions ? Math.min(lettersOnly.length, maxQuestions) : lettersOnly.length;
    for (let i = 0; i < limit; i++) {
      result[i + 1] = lettersOnly[i];
    }
  }

  return result;
}

/**
 * Formats a record of answers into canonical format, with section breakdown if multiple sections exist
 */
export function formatAnswersToString(
  answers: Record<number, string>,
  sections?: Section[]
): string {
  if (!sections || sections.length <= 1) {
    const keys = Object.keys(answers)
      .map(Number)
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);

    return keys.map(k => `${k} ${answers[k]}`).join(' ');
  }

  // Multi-section formatted output
  const sectionParts: string[] = [];
  sections.forEach((sec, idx) => {
    const secPairs: string[] = [];
    for (let i = 1; i <= sec.count; i++) {
      const absIndex = sec.startIdx + i - 1;
      if (answers[absIndex]) {
        secPairs.push(`${i}.${answers[absIndex]}`);
      }
    }
    if (secPairs.length > 0) {
      const header = sec.name.toUpperCase();
      sectionParts.push(`${header}\n${secPairs.join(' ')}`);
    }
  });

  return sectionParts.join('\n\n');
}
