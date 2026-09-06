// Shared tuning for the app's virtualized lists.
//
// The screens that scroll a feed (home, search results, order history,
// favourites) all render the same kind of row: a full-width card carrying a
// remote photo. Left on FlatList's defaults, `windowSize: 21` keeps ten
// screenfuls mounted either side of the viewport — for cards this tall that is
// most of a long result set still in memory, which is the thing virtualizing
// was meant to avoid. Four screenfuls either way is enough that a normal flick
// never outruns the renderer, and it holds memory flat as the list grows.
//
// `removeClippedSubviews` is deliberately left off: several of these cards
// position children absolutely (the favourite heart, the rating pill that
// hangs past the card's edge) and Android's clipping has a long history of
// dropping exactly those.
export const LIST_PERF = {
  maxToRenderPerBatch: 6,
  windowSize: 9,
  updateCellsBatchingPeriod: 50,
};
