const OPENING = 'A little hope, on the edge of the dark.';
const BLEAK = [OPENING,
  'Shadows linger in dark places.',
  'Doubt creeps into the heroes’ hearts.',
  'There is still hope, yet it is waning.',
  'Evil gathers strength. Our own dwindles.',
  'Darkness takes root in weary hearts.',
  'What hope remains grows cold.',
  'The gods have fallen silent. We stand alone.',
  'Fear fills the spaces hope once held.',
  'One final dawn. We have nothing left but each other.',
];
const HOPEFUL = [OPENING,
  'We still cling to hope.',
  'All is not lost while we can fight.',
  'The tide of darkness can be turned.',
  'Each step forward leaves a bitter taste.',
  'Against the odds, we endure.',
  'Unbroken, unyielding, we stand against the dark.',
  'Through shadow and fire, we persevere.',
  'There is light at the end of this night.',
  'One final dawn. Today, we carry the light below.',
];
export function expeditionOutcome({ clearedFloor, recordBefore, previousClearedFloor, departed, returned, retreatType }) {
  const progress = clearedFloor > recordBefore;
  if (departed >= 3 && progress && retreatType === 'manual' && returned === departed) return 'clean-retreat';
  if (departed >= 3 && previousClearedFloor !== null && clearedFloor < previousClearedFloor && departed - returned >= departed / 2) return 'costly-setback';
  return progress ? 'progress' : 'no-progress';
}
export function townMorale(day, lastExpedition, victoryAchieved) {
  if (victoryAchieved) return { tone: 'victory', text: 'The dungeon lord has fallen. Hope has a home again.' };
  if (day === 1 || !lastExpedition) return { tone: 'opening', text: OPENING };
  const tone = lastExpedition.outcome;
  if (tone === 'clean-retreat') return { tone, text: 'Further into the dark. Every soul brought home.' };
  if (tone === 'costly-setback') return { tone, text: 'So many lost, and the way ahead no nearer.' };
  const index = Math.max(0, Math.min(9, day - 1));
  return { tone, text: (tone === 'progress' ? HOPEFUL : BLEAK)[index] };
}
