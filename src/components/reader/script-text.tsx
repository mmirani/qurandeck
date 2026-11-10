import { splitScript } from "@/lib/text";

export function ScriptText({ text }: { text: string }) {
  const pieces = splitScript(text);
  return (
    <>
      {pieces.map((piece, index) =>
        piece.arabic ? (
          <span key={index} lang="ar" dir="rtl" translate="no" className="script-naskh">
            {piece.text}
          </span>
        ) : (
          <span key={index}>{piece.text}</span>
        ),
      )}
    </>
  );
}
