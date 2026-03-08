// ============================================================
// Banter Engine – 109 messages across 12 categories
// ============================================================
// Pre-written message bank with random selection per scenario.
// Dynamic variables injected at runtime. No AI/API calls.
// Tone: Sweary, sarcastic, personal, over-the-top. Gloves off.
// ============================================================

// ---- MESSAGE BANKS ----

const BANK = {
  // CATEGORY 1: Big Loss (>2%)
  bigLoss: [
    "Jesus fucking Christ, {name}. {pct}% down. What happened – did you shit out a whole person?",
    "{name}'s down {pct}%. Bet the missus doesn't recognise you. Bet she's disappointed.",
    "{pct}% gone. Honestly {name}, nobody thought you had it in you. We had a group chat about it.",
    "{name} just lost {pct}%. Someone check his house – he's clearly not eating. Or he's on the gear. Either way, suspicious.",
    "Down {pct}%. {name}'s out here making the rest of you look like you've been training for a pie-eating contest.",
    "{name}, {pct}% lighter and still the worst dressed in the group. But fair fucking play.",
    "Alert: {name} has lost {pct}% of themselves. Missing body mass last seen around the waistline. If found, do NOT return.",
    "{pct}%? Alright {name}, calm down. Nobody likes a show-off. Actually, keep going – the rest of these pricks need humbling.",
    "{pct}% down. {name}, you absolute weapon. The rest of these frauds are rattled.",
    "{name}'s lost {pct}%. At this rate there'll be nothing left of you by June. What a way to go.",
    "Down {pct}%. {name}'s walking around like a man who's discovered vegetables exist. Inspirational, in a tragic sort of way.",
    "{pct}% lighter. {name}, I don't know if you've found Jesus or cocaine but keep doing whatever it is.",
    "Someone call the police – {name}'s lost {pct}% and it looks like theft. Stolen from his own gut.",
    "{name} dropping {pct}% like it's easy. It's not easy, is it {name}? You look terrible. But thinner. Well done.",
    "{pct}% off. {name} came here to ruin friendships and lose weight and he's doing both.",
  ],

  // CATEGORY 2: Moderate Loss (0.5–2%)
  moderateLoss: [
    "{name}'s down {pct}%. Not bad. Not great. Like a solid 6/10 shag – got the job done but nobody's bragging about it.",
    "{pct}% from {name}. Respectable. You're not winning anything, but at least you're not a total embarrassment.",
    "Down {pct}%. {name}'s doing the bare minimum and somehow making it look hard.",
    "{name} drops {pct}%. It's progress. Slow, unglamorous, deeply average progress. But progress.",
    "{pct}%. {name}, that's the kind of result that says 'I had one less pint this week.' Revolutionary stuff.",
    "A solid {pct}% from {name}. Won't make the headlines but won't make the wall of shame either. The Switzerland of weigh-ins.",
    "{name}'s down {pct}%. Ticking along. Like a diesel engine – not fast, not exciting, but it'll get there eventually.",
    "{pct}% off. {name}'s in no-man's land – too much to mock, too little to celebrate. Awkward.",
  ],

  // CATEGORY 3: Barely Moved (<0.5%)
  barelyMoved: [
    "{pct}%? {name}, my cock weighs more than that. What's the fucking point?",
    "{name} checked in at {pct}%. That's not progress, that's a measurement error.",
    "{pct}%. {name}, be honest – did you weigh yourself before and after a wank and call it a diet?",
    "Oh look, {name}'s lost {pct}%. That's roughly one Pringle. Well done, champion.",
    "{pct}%? Was that a weigh-in or a cry for help, {name}?",
    "{name} with the {pct}% check-in. I've seen more weight loss from a decent sneeze. Sort your life out.",
    "Technically {name} is {pct}% lighter. Technically I could run a marathon. Neither of us are trying though, are we?",
    "{name}'s contribution this week: {pct}%. The scale literally didn't move. It's laughing at you.",
    "{pct}%? {name}, I've lost more weight scratching my balls.",
    "Incredible scenes – {name} has shifted {pct}%. The scientific community is baffled. Mainly at how little effort you're putting in.",
    "{name} with a heroic {pct}%. Mate, you could breathe out harder than that.",
    "{pct}%. {name}, at this pace you'll hit your target weight in 2047. Keep it up.",
    "Breaking news: {name} has lost {pct}%. In other news, nobody gives a shit.",
    "{name}'s {pct}% lighter. So you had a shave. Congratulations.",
    "{pct}%? That's fuck all, {name}. Your wallet loses more weight than that on a Friday night.",
    "The scales moved {pct}% for {name}. Might have been the wind, to be honest.",
  ],

  // CATEGORY 4: Gained Weight
  gained: [
    "{name}'s up {pct}%. You fat greedy cunt. This isn't an eating competition.",
    "+{pct}%? {name}, you're supposed to be losing weight, not cultivating a second arse.",
    "Fucking hell {name}, +{pct}%. Did you eat another contestant?",
    "{name}'s gained {pct}%. Lads, he's speedrunning diabetes. Someone take his Deliveroo account.",
    "+{pct}%. {name}, I genuinely don't know how you've managed this. Were you trying to gain? Is this a protest?",
    "{name} up {pct}%. The only thing you're losing is everyone's respect.",
    "+{pct}%? Right {name}, hand in your scales, you're clearly not using them for motivation.",
    "{name}'s put ON {pct}%. At this point just lean into it mate, enter a strongman comp instead.",
    "+{pct}%. {name}, what the fuck have you been doing? Actually – don't tell us. We can smell the kebab from here.",
    "{name}'s gained {pct}%. Legend has it he's still eating.",
    "+{pct}%? {name}, you're not bulking, you're just lying to yourself.",
    "Up {pct}%. {name}, even your scales are judging you. They made a sad noise when you stepped on.",
    "{name} +{pct}%. Lads, we've lost him. He's gone to the dark side. The dark side has biscuits, apparently.",
    "Gained {pct}%. {name}, at this rate the only thing you're winning is a bigger belt.",
    "+{pct}%? {name}, were you sponsored by Greggs this week? Because it looks like they won.",
    "{name}'s up {pct}%. The man looked at a salad, laughed, and ordered a curry. Respect for the commitment to failure.",
  ],

  // CATEGORY 5: Zero Change (exactly 0.0%)
  zeroChange: [
    "Congratulations {name}, you've achieved nothing. Literally nothing. 0.0%. Incredible commitment to staying exactly the same.",
    "{name} weighed in at exactly the same weight. The universe's way of saying 'try harder, dickhead.'",
    "0.0% change for {name}. Not up, not down, just... there. Like a traffic cone. About as useful, too.",
  ],

  // CATEGORY 6: Welcome / First Weigh-in
  welcome: [
    "Welcome to the pain, {name}. Starting at {weight}. Let's see what you're made of. Mostly fat, probably.",
    "{name} has entered the arena at {weight}. God help you.",
    "Fresh meat! {name} joins at {weight}. The rest of you just got another person to beat. Or lose to. Probably lose to.",
    "{name}'s in at {weight}. Brave. Stupid, but brave. Welcome to Fat Cunts.",
  ],

  // CATEGORY 7: Worst Winner (winner gained weight)
  worstWinner: [
    "Sprint {sprint} goes to {name} with a frankly embarrassing +{pct}%. You didn't win – everyone else just lost harder. Collects £{prize} out of pity.",
    "{name} 'wins' Sprint {sprint} at +{pct}%. Congratulations on being the least shit. The bar was underground and you still tripped over it.",
    "Sprint {sprint} champion: {name}. And I use the word 'champion' extremely fucking loosely. +{pct}%. What is wrong with all of you?",
  ],

  // CATEGORY 8: Absent – Missed This Weekend
  absent1: [
    "No weigh-in from {name} this weekend. Definitely hiding. Probably eating.",
    "{name}'s gone dark. Either dead or too ashamed to step on the scales. Hoping for ashamed.",
    "Interesting strategy from {name} – the old 'if I don't weigh in, it didn't happen' approach.",
    "Has anyone checked on {name}? Not out of concern. Just want to know how fat he's got.",
    "{name} didn't weigh in. Bottle gone. Completely bottle gone.",
    "Missing in action: {name}. Last seen heading towards a Nando's. Presumed stuffed.",
    "No sign of {name} on the scales. Probably stuck in a doorframe somewhere.",
    "{name}'s not weighed in. The coward's diet – if you don't look at the number, the calories don't count.",
  ],

  // CATEGORY 9: Absent – 2+ Consecutive Weeks
  absentSerial: [
    "{name} hasn't weighed in for {weeks} weeks. At this point we should file a missing persons report. Or a wide-load alert.",
    "Week {weeks} of radio silence from {name}. Either he's in a coma or he's given up. Both involve lying down.",
    "{name}: {weeks} weeks AWOL. The only thing he's been consistent at is avoiding accountability.",
    "Still nothing from {name}. {weeks} weeks now. We should send a search party. A wide search party.",
    "{name}'s been quiet for {weeks} weeks. Probably can't reach his phone over his stomach.",
    "{weeks} weeks without a weigh-in from {name}. He's not even pretending to try anymore. Beautiful.",
    "It's been {weeks} weeks since {name} last faced the music. The scales are gathering dust. His arse is gathering mass.",
    "{name}: MIA for {weeks} weeks. Lads, he's not coming back. Leave him. Save yourselves.",
  ],

  // CATEGORY 10: Sprint Winner Celebration
  sprintWin: [
    "Sprint {sprint} goes to {name}! {pct}% lost. Get in there you skinny bastard. Well, skinny-ER bastard.",
    "{name} takes Sprint {sprint}. {pct}% in {weeks} weeks. The prick's actually gone and done it. Collects £{prize}.",
    "Sprint {sprint} winner: {name}. Let's be honest, none of you saw that coming. Including {name}.",
    "And the Sprint {sprint} title goes to... {name}! {pct}% lost. The rest of you can fuck off and try harder next time.",
    "Bow down to {name}, your Sprint {sprint} champion. {pct}% lost and £{prize} richer. You hate to see it. Unless you're {name}.",
    "{name} wins Sprint {sprint}! Everyone else: that's your money he's taking. Let that sink in while you eat your feelings.",
    "Sprint {sprint}: {name} walks away with £{prize} and everyone else walks away with nothing but regret and love handles.",
    "OFFICIAL: {name} is your Sprint {sprint} champion. {pct}% lost. The man's a machine. An annoying, smug machine.",
  ],

  // CATEGORY 11: Sprint Last Place Roast
  sprintLose: [
    "Dead last in Sprint {sprint}: {name}. Somehow managed to be the worst out of a group of people who are all terrible. Impressive.",
    "Sprint {sprint}'s biggest disappointment: {name}. And that's saying something in this group.",
    "{name} finished last in Sprint {sprint}. Not last as in 'nearly got there.' Last as in 'weren't even trying.'",
    "Wooden spoon for Sprint {sprint} goes to {name}. Your prize is shame. Wear it well.",
    "Sprint {sprint} is over and {name} came dead last. To be fair, at least {name} turned up. Oh wait – barely.",
    "Someone had to come last in Sprint {sprint} and {name} volunteered with enthusiasm. {pct}% change. Pitiful.",
    "Congratulations {name} – you've won Sprint {sprint}'s 'Least Improved' award. It's not a real award. Like your effort wasn't real effort.",
    "And finally, bringing up the rear in Sprint {sprint}: {name}. The group's anchor. And not in a good way.",
  ],

  // CATEGORY 12: Comparison Commentary
  comparison: [
    "You're currently {rank} out of {total}. {leader} is top with {leadPct}%. You're {diff}% behind. Better get moving.",
    "That puts you {rank}/{total}. Right behind {aheadName} – only {gap}% in it. One good week and you've got the prick.",
    "You're sitting at {rank}/{total}. Comfortably mid-table. The Arsenal of this competition.",
    "Dead last, {name}. {total} players and you're behind every single one of them. Let that marinate.",
    "Top of the pile. {pct}% lost and nobody's close. Don't get cocky though – {behindName} is only {gap}% back.",
    "You've overtaken {overtakenName} this week. They're probably fuming. Good.",
    "You've dropped from {oldRank} to {newRank}. {overtakerName} just walked past you. How does that feel?",
    "{name}, you haven't moved in the rankings for {weeks} weeks. Stuck. Like your metabolism.",
  ],
};

// ---- VARIABLE INJECTION ----

const inject = (template, vars) => {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
};

/** Pick a random message from a bank */
const pick = (bank) => bank[Math.floor(Math.random() * bank.length)];

// ---- PUBLIC API ----

/**
 * Get a weigh-in reaction message.
 * @param {object} vars - { name, pct (absolute), signed (positive=loss), weight, isFirstWeighIn }
 */
export const getWeighInReaction = (vars) => {
  const { name, pct, signed, weight, isFirstWeighIn } = vars;

  if (isFirstWeighIn) {
    return inject(pick(BANK.welcome), { name, weight });
  }

  const absPct = Math.abs(pct).toFixed(1);
  const v = { name, pct: absPct };

  // Zero change
  if (Math.abs(pct) < 0.05) {
    return inject(pick(BANK.zeroChange), v);
  }

  // Gained weight (signed is positive = loss, negative = gain)
  if (signed < 0) {
    return inject(pick(BANK.gained), { ...v, pct: Math.abs(signed).toFixed(1) });
  }

  // Lost weight
  if (signed > 2) return inject(pick(BANK.bigLoss), v);
  if (signed >= 0.5) return inject(pick(BANK.moderateLoss), v);
  return inject(pick(BANK.barelyMoved), v);
};

/**
 * Get a comparison commentary after weigh-in.
 * @param {object} vars - { name, rank, total, pct, leader, leadPct, diff,
 *                          aheadName, behindName, gap, oldRank, newRank,
 *                          overtakenName, overtakerName, weeks }
 */
export const getComparisonCommentary = (vars) => {
  const { rank, total, oldRank, newRank } = vars;

  // Filter to contextually appropriate messages
  let pool = [];

  if (rank === 1) {
    pool = BANK.comparison.filter(
      (m) => m.includes("Top of the pile") || m.includes("{rank}")
    );
  } else if (rank === total) {
    pool = BANK.comparison.filter(
      (m) => m.includes("Dead last") || m.includes("{rank}")
    );
  } else if (oldRank && newRank && newRank < oldRank) {
    pool = BANK.comparison.filter(
      (m) => m.includes("overtaken") || m.includes("{rank}")
    );
  } else if (oldRank && newRank && newRank > oldRank) {
    pool = BANK.comparison.filter(
      (m) => m.includes("dropped") || m.includes("{rank}")
    );
  } else {
    pool = BANK.comparison;
  }

  if (pool.length === 0) pool = BANK.comparison;
  return inject(pick(pool), vars);
};

/**
 * Get an absent player message.
 * @param {object} vars - { name, weeks }
 */
export const getAbsentMessage = (vars) => {
  const { weeks } = vars;
  if (weeks >= 2) {
    return inject(pick(BANK.absentSerial), vars);
  }
  return inject(pick(BANK.absent1), vars);
};

/**
 * Get a sprint winner message.
 * @param {object} vars - { name, sprint, pct, weeks, prize, allGained }
 */
export const getSprintWinMessage = (vars) => {
  if (vars.allGained) {
    return inject(pick(BANK.worstWinner), vars);
  }
  return inject(pick(BANK.sprintWin), vars);
};

/**
 * Get a sprint last place roast.
 * @param {object} vars - { name, sprint, pct }
 */
export const getSprintLoseMessage = (vars) => {
  return inject(pick(BANK.sprintLose), vars);
};

/**
 * Get multiple absent player sluglines for a round-up.
 * @param {Array<{name: string, weeks: number}>} absentPlayers
 */
export const getAbsentRoundUp = (absentPlayers) => {
  return absentPlayers.map((p) => getAbsentMessage(p));
};

// Export the bank for testing/debugging
export const _BANK = BANK;
