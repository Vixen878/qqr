import React from 'react';

interface PayloadDisplayProps {
    payload: string;
}

interface ParsedPart {
    tag: string;
    length: string;
    value: string;
    raw: string;
}

const parsePayload = (payload: string): ParsedPart[] => {
    const parts: ParsedPart[] = [];
    let i = 0;
    while (i < payload.length) {
        if (i + 4 > payload.length) {
            // Not enough characters for tag and length
            break;
        }
        const tag = payload.substring(i, i + 2);
        const lengthStr = payload.substring(i + 2, i + 4);
        const length = parseInt(lengthStr, 10);

        if (isNaN(length) || i + 4 + length > payload.length) {
            // Invalid length or not enough characters for value
            break;
        }

        const value = payload.substring(i + 4, i + 4 + length);
        parts.push({ tag, length: lengthStr, value, raw: payload.substring(i, i + 4 + length) });
        i += 4 + length;
    }
    return parts;
};


export const PayloadDisplay: React.FC<PayloadDisplayProps> = ({ payload }) => {
    const parsedParts = parsePayload(payload);

    return (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner mt-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Generated Payload</h3>
            <div className="w-full break-words font-mono text-sm bg-white dark:bg-gray-900 p-3 rounded-md">
                {parsedParts.length > 0 ? (
                    parsedParts.map((part, index) => (
                        <span key={index}>
                            <span className="text-blue-500 dark:text-blue-400" title={`Tag: ${part.tag}`}>{part.tag}</span>
                            <span className="text-red-500 dark:text-red-400" title={`Length: ${part.length}`}>{part.length}</span>
                            <span className="text-green-600 dark:text-green-400" title={`Value: ${part.value}`}>{part.value}</span>
                        </span>
                    ))
                ) : (
                    <span className="text-gray-400">Payload will appear here...</span>
                )}
            </div>
        </div>
    );
};