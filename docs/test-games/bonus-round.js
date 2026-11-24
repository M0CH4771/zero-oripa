// Each accepted round already contains its complete, payable feature event.
export function hasFeature(game, round) {
  if (round.guarantee || round.guaranteed) return false;
  switch (game) {
    case 'mine': return round.opened.some(Boolean);
    case 'rush': return round.spins.some(s => s.win > 0 && s.bombs.length && s.steps.length);
    case 'fruit': return round.spins.some(s => s.win > 0 && s.steps.some(step => step.wins.some(w => w.mult > 1)));
    case 'gods': return round.spins.some(s => s.win > 0 && s.orbs.length && s.tumbleRaw > 0);
    case 'dogs': return round.spins.some(s => s.win > 0 && s.groups.some(g => g.cells.some(i => s.grid[i]?.startsWith('W'))));
    case 'train': return round.spins.some(s => s.events.some(e => e.name === 'NEW COINS' && e.hits.length));
    case 'dwarf': return round.spins.some(s => s.win > 0 && s.chests?.some(c => c.value > 0));
    default: return false;
  }
}
