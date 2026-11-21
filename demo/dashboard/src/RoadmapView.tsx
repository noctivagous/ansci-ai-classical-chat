import { useState } from "react";
import { ROADMAP_PARTS } from "./roadmap";

/**
 * "Path to a Working Chatbot" — tabbed roadmap, one tab per part.
 * Each part shows where it stands, its remaining steps in order,
 * and the requirements it must meet. Statuses stay per part: the
 * page does not average them into a single readiness number.
 */
export default function Roadmap() {
  const [active, setActive] = useState(ROADMAP_PARTS[0].id);
  const part = ROADMAP_PARTS.find((p) => p.id === active) ?? ROADMAP_PARTS[0];
  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Parts of the path to a working chatbot">
        {ROADMAP_PARTS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === active}
            className={p.id === active ? "tab active" : "tab"}
            onClick={() => setActive(p.id)}
          >
            {p.tab}
          </button>
        ))}
      </div>
      <article className="panel roadmap-panel">
        <p className="card-area">{part.title}</p>
        <p className="roadmap-status">
          <span className="badge info">{part.status}</span>
        </p>
        <h4>Where it stands</h4>
        <p>{part.stands}</p>
        <h4>Task list</h4>
        <ul className="tasklist">
          {part.roadmap.map((step, i) => (
            <li key={i} className={step.done ? "done" : undefined}>
              <input type="checkbox" checked={step.done} disabled readOnly aria-label={step.done ? "done" : "not done"} />
              <span>{step.text}</span>
            </li>
          ))}
        </ul>
        <h4>Requirements — the acceptance checklist</h4>
        <ul className="tasklist reqlist">
          {part.requirements.map((req, i) => (
            <li key={i}>
              <input type="checkbox" checked={false} disabled readOnly aria-label="must hold before this part is called done" />
              <span>{req}</span>
            </li>
          ))}
        </ul>
        <p className="source">{part.source}</p>
      </article>
    </div>
  );
}
