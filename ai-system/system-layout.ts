// system-layout.ts — presentation only.
//
// Where each node sits on the displayed map: its order among its
// siblings, and (where a node needs one) a column/row placement.
// Move columns, swap rows of tree-node levels, reorder sections —
// edit THIS file; the system's description in system-map.ts does not
// change, and the correspondence check keeps the two in step: every
// node in the map has a layout entry, and every layout entry names a
// real node.

export interface NodeLayout {
  order: number;
  col?: number;
  row?: number;
  span?: number;
}

export interface SystemLayout {
  nodes: Record<string, NodeLayout>;
}

// <layout-data>
export const SYSTEM_LAYOUT: SystemLayout = {
  "nodes": {
    "system": {
      "order": 1
    },
    "configuration": {
      "order": 1
    },
    "awareness": {
      "order": 2
    },
    "awareness/self": {
      "order": 1
    },
    "awareness/self/identity": {
      "order": 1
    },
    "awareness/self/capabilities": {
      "order": 2
    },
    "awareness/self/disposition": {
      "order": 3
    },
    "awareness/self/own-state": {
      "order": 4
    },
    "awareness/place-and-time": {
      "order": 2
    },
    "awareness/place-and-time/season-daypart": {
      "order": 1
    },
    "awareness/place-and-time/channel": {
      "order": 2
    },
    "awareness/surroundings": {
      "order": 3
    },
    "awareness/surroundings/standing-topics": {
      "order": 1
    },
    "awareness/surroundings/other-presences": {
      "order": 2
    },
    "awareness/current-activity": {
      "order": 4
    },
    "awareness/current-activity/composer": {
      "order": 1
    },
    "awareness/current-activity/situation-statement": {
      "order": 2
    },
    "awareness/current-activity/last-act": {
      "order": 3
    },
    "awareness/current-activity/open-gaps": {
      "order": 4
    },
    "awareness/social-unit": {
      "order": 5
    },
    "awareness/social-unit/interlocutor": {
      "order": 1
    },
    "awareness/social-unit/conversation": {
      "order": 2
    },
    "lpu": {
      "order": 3
    },
    "lpu/parser": {
      "order": 1
    },
    "lpu/parser/token": {
      "order": 1
    },
    "lpu/parser/sense": {
      "order": 2
    },
    "lpu/parser/valency": {
      "order": 3
    },
    "lpu/parser/aspect-and-forms": {
      "order": 4
    },
    "lpu/semantic-assessment": {
      "order": 2
    },
    "lpu/language-emotion-desire-unit": {
      "order": 3
    },
    "lpu/senses-scening-unit": {
      "order": 4
    },
    "lpu/normalcy-assessment": {
      "order": 5
    },
    "lpu/quantification-language-unit": {
      "order": 6
    },
    "lpu/generator": {
      "order": 7
    },
    "lpu/unplaced": {
      "order": 8
    },
    "session-and-situation": {
      "order": 4
    },
    "session-and-situation/states-and-origins": {
      "order": 1
    },
    "session-and-situation/events": {
      "order": 2
    },
    "session-and-situation/topics": {
      "order": 3
    },
    "session-and-situation/corrections": {
      "order": 4
    },
    "session-and-situation/open-unknowns": {
      "order": 5
    },
    "knowledge": {
      "order": 5
    },
    "knowledge/lexicon": {
      "order": 1
    },
    "knowledge/variant-graph": {
      "order": 2
    },
    "knowledge/banked": {
      "order": 3
    },
    "reasoning": {
      "order": 6
    },
    "reasoning/derivation": {
      "order": 1
    },
    "reasoning/planner": {
      "order": 2
    },
    "reasoning/pricing": {
      "order": 3
    },
    "reasoning/decline-floor": {
      "order": 4
    },
    "reasoning/compositions": {
      "order": 5
    },
    "reasoning/problem-solving": {
      "order": 6
    },
    "reasoning/problem-solving/external": {
      "order": 1
    },
    "reasoning/problem-solving/abstract": {
      "order": 2
    },
    "reasoning/problem-solving/internal": {
      "order": 3
    },
    "reasoning/problem-solving/internal-system": {
      "order": 4
    },
    "reasoning/problem-solving/external-system": {
      "order": 5
    },
    "reasoning/problem-solving/user-problems": {
      "order": 6
    },
    "coherence": {
      "order": 7
    },
    "coherence/coherence-demand": {
      "order": 1
    },
    "coherence/coherence-analysis": {
      "order": 2
    },
    "intake": {
      "order": 8
    },
    "intake/router": {
      "order": 1
    },
    "intake/cskg": {
      "order": 2
    },
    "intake/wikidata": {
      "order": 3
    },
    "intake/web": {
      "order": 4
    },
    "intake/model": {
      "order": 5
    },
    "retrieval-harborer": {
      "order": 9
    },
    "retrieval-harborer/pipeline": {
      "order": 1
    },
    "retrieval-harborer/gate": {
      "order": 2
    },
    "verbalizer": {
      "order": 10
    },
    "surfaces": {
      "order": 11
    },
    "surfaces/root-page": {
      "order": 1
    },
    "surfaces/dashboard": {
      "order": 2
    },
    "surfaces/chat": {
      "order": 3
    },
    "surfaces/trace-view": {
      "order": 4
    },
    "ontology-core": {
      "order": 12
    },
    "ontology-core/ontology-knowledge-unit": {
      "order": 1
    },
    "ontology-core/ontology-knowledge-unit/correspondence-graph": {
      "order": 1
    },
    "ontology-core/ontology-knowledge-unit/classification": {
      "order": 2
    },
    "ontology-core/ontology-knowledge-unit/quantification-unit": {
      "order": 3
    },
    "ontology-core/ontology-knowledge-unit/quantification-unit/units-measurement-unit": {
      "order": 1
    },
    "ontology-core/emotion-desire-unit": {
      "order": 2
    },
    "ontology-core/sense-unit": {
      "order": 3
    },
    "ontology-core/normalcy-unit": {
      "order": 4
    },
    "unplaced": {
      "order": 13
    },
    "person": {
      "order": 14
    },
    "clock": {
      "order": 15
    },
    "weather": {
      "order": 16
    }
  }
};
// </layout-data>
