import { sectionItems } from "@/data/menu";

// The menu screen's row model.
//
// Both storefront layouts used to be drawn as a tree inside one ScrollView, so
// every dish on the menu mounted before the first frame — a 120-dish kitchen
// paid for 120 cards, 120 images and 120 Add buttons to show the six the
// customer could actually see. Flattening the tree into a list of rows lets the
// screen virtualize it: only the rows around the viewport are mounted, and the
// rest cost an entry in this array.
//
// It also replaces the offset bookkeeping the jump-to-section control used to
// need. A row carries the ids it's the anchor for, so "scroll to Beverages"
// resolves to a row index (see `rowIndexById`) instead of a `y` that some
// per-node `onLayout` had to measure first — which meant a section could only
// be jumped to once it had already been rendered.
//
// Row shapes, all carrying a stable `key`:
//   { type: "rail" }                          compact only, the sticky section rail
//   { type: "sectionTitle", title, itemCount } compact heading
//   { type: "groupTitle", title }              compact named group heading
//   { type: "item", item, first }              compact dish row
//   { type: "sectionHeader", section, itemCount } grid heading for an open section
//   { type: "gridRow", items, first }          grid, two dishes to a row
//   { type: "collapsed", sections }            grid, a run of folded sections as one card
//   { type: "empty" }                          nothing matched the search/filter
//
// `anchors` lists the section (or group) ids a row is the jump target for, and
// `sectionId` names the section a row belongs to, which is what the rail reads
// to highlight the section being scrolled through.

// Two dishes to a row, matching the design's grid. A trailing odd item keeps its
// half of the row rather than stretching across it, so every card in the section
// is the same width.
const GRID_COLUMNS = 2;

// The photo-led grid. Neighbouring folded sections are drawn as one card, so the
// list is walked into runs as it's flattened.
export function gridRows(sections, isOpen) {
  const rows = [];
  let run = null;

  for (const section of sections) {
    if (!isOpen(section)) {
      if (run) {
        run.sections.push(section);
        run.anchors.push(section.id);
      } else {
        run = {
          type: "collapsed",
          key: `collapsed:${section.id}`,
          sections: [section],
          anchors: [section.id],
        };
        rows.push(run);
      }
      continue;
    }

    run = null;

    // A section holds its dishes directly or splits them across named groups —
    // the grid draws both as one flat grid, so it asks for the dishes rather
    // than reaching for `section.items`, which a grouped section doesn't have.
    const items = sectionItems(section);

    rows.push({
      type: "sectionHeader",
      key: `section:${section.id}`,
      anchors: [section.id],
      sectionId: section.id,
      section,
      itemCount: items.length,
    });

    for (let index = 0; index < items.length; index += GRID_COLUMNS) {
      const pair = items.slice(index, index + GRID_COLUMNS);
      rows.push({
        type: "gridRow",
        key: `row:${section.id}:${pair[0].id}`,
        sectionId: section.id,
        items: pair,
        first: index === 0,
      });
    }
  }

  return rows.length ? rows : [{ type: "empty", key: "empty" }];
}

// The compact list. The rail is row zero rather than part of the list header so
// the list can stick it to the top the way the ScrollView used to — a header's
// contents can't be made sticky, but a row can.
export function compactRows(sections) {
  const rows = [{ type: "rail", key: "rail" }];

  if (!sections.length) {
    rows.push({ type: "empty", key: "empty" });
    return rows;
  }

  for (const section of sections) {
    rows.push({
      type: "sectionTitle",
      key: `section:${section.id}`,
      anchors: [section.id],
      sectionId: section.id,
      title: section.title,
      itemCount: sectionItems(section).length,
    });

    // An ungrouped section is walked as a single anonymous group, so the dish
    // rows below are built once rather than once per shape.
    const groups = section.groups ?? [{ id: null, items: section.items ?? [] }];

    for (const group of groups) {
      if (group.id) {
        rows.push({
          type: "groupTitle",
          key: `group:${group.id}`,
          anchors: [group.id],
          sectionId: section.id,
          title: group.title,
        });
      }

      group.items.forEach((item, index) => {
        rows.push({
          type: "item",
          key: `item:${section.id}:${item.id}`,
          sectionId: section.id,
          item,
          first: index === 0,
        });
      });
    }
  }

  return rows;
}

// Where each section — and, in the compact layout, each named group — starts.
// The first row claiming an id wins, so a run of folded sections all point at
// the card they're drawn in, which is where the old per-block offset pointed.
export function rowIndexById(rows) {
  const index = {};

  rows.forEach((row, position) => {
    for (const id of row.anchors ?? []) {
      if (index[id] == null) index[id] = position;
    }
  });

  return index;
}
