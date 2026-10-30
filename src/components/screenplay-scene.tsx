import { layoutElements } from "@/lib/screenplay-format";
import { formatScreenplayHeading } from "@/lib/script-export";
import type { ScriptElementType } from "@/lib/schemas/scene";

interface ScreenplaySceneProps {
  heading: string;
  elements: ReadonlyArray<{
    id?: string;
    type: ScriptElementType;
    text: string;
  }>;
  emptyLabel?: string;
  className?: string;
}

/**
 * Read-only screenplay formatting using the same indents as the printed script
 * (cue 2.2in, dialogue 1in–4.5in, parenthetical 1.6in, transitions right).
 * Used for the before/after polish view and the full-script preview.
 */
export function ScreenplayScene({
  heading,
  elements,
  emptyLabel = "No script elements yet.",
  className = "",
}: ScreenplaySceneProps) {
  const visible = layoutElements(elements);

  return (
    <div
      className={`rounded-lg bg-white px-4 py-4 font-mono text-[13px] leading-[1.2] text-stone-800 ${className}`}
    >
      <p className="font-normal uppercase text-stone-900">
        {heading.trim() ? formatScreenplayHeading(heading) : "UNTITLED SCENE"}
      </p>

      {visible.length === 0 ? (
        <p className="mt-3 text-xs italic text-stone-400">{emptyLabel}</p>
      ) : (
        <div className="mt-[1.2em]">
          {visible.map((element, index) => {
            const key = element.id ?? `${element.type}-${index}`;
            const previous = visible[index - 1]?.type;
            const glued =
              (previous === "character" && (element.type === "dialogue" || element.type === "parenthetical")) ||
              (previous === "parenthetical" && element.type === "dialogue");
            const spacing = glued ? "" : index === 0 ? "" : "mt-[1.2em]";

            switch (element.type) {
              case "character":
                return (
                  <p key={key} className={`${spacing} ml-[36%] uppercase`}>
                    {element.text}
                  </p>
                );
              case "parenthetical":
                return (
                  <p key={key} className={`${spacing} ml-[26%] mr-[38%]`}>
                    {element.text}
                  </p>
                );
              case "dialogue":
                return (
                  <p key={key} className={`${spacing} ml-[16%] mr-[24%] whitespace-pre-wrap`}>
                    {element.text}
                  </p>
                );
              case "transition":
                return (
                  <p key={key} className={`${spacing} text-right uppercase`}>
                    {element.text}
                  </p>
                );
              default:
                return (
                  <p key={key} className={`${spacing} whitespace-pre-wrap`}>
                    {element.text}
                  </p>
                );
            }
          })}
        </div>
      )}
    </div>
  );
}
