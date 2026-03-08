// ============================================================
// Utility Functions
// ============================================================

import { fromTimestamp } from "./firebase.js";

// ---- WEIGHT CONVERSION ----

/** Convert from user's unit to kg for storage */
export const toKg = (weight, unit) => {
  const w = parseFloat(weight);
  if (isNaN(w)) return 0;
  if (unit === "lbs") return w * 0.453592;
  if (unit === "st") return w * 6.35029;
  return w;
};

/** Convert from kg to user's preferred unit */
export const fromKg = (kg, unit) => {
  if (unit === "lbs") return kg / 0.453592;
  if (unit === "st") return kg / 6.35029;
  return kg;
};

/** Format a weight value with its unit label */
export const fmtWeight = (kg, unit, decimals = 1) => {
  const val = fromKg(kg, unit);
  return `${val.toFixed(decimals)}${unit}`;
};

/** Validate a weight entry - returns error string or null */
export const validateWeight = (weight, unit) => {
  const w = parseFloat(weight);
  if (isNaN(w) || w <= 0) return "That's not a real weight. Try again.";
  if (unit === "kg" && (w < 30 || w > 300))
    return "Between 30-300kg please. You're not a small child or an elephant.";
  if (unit === "lbs" && (w < 66 || w > 660))
    return "Between 66-660lbs please. Be serious.";
  if (unit === "st" && (w < 4 || w > 47))
    return "Between 4-47 stone please. Come on.";
  return null;
};

// ---- DATE HELPERS ----

/** Format a date or timestamp to "8 Mar" style */
export const fmtDate = (d) => {
  if (!d) return "-";
  const date = d instanceof Date ? d : fromTimestamp(d);
  if (!date) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Format full date "8 Mar 2025" */
export const fmtDateFull = (d) => {
  if (!d) return "-";
  const date = d instanceof Date ? d : fromTimestamp(d);
  if (!date) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Days remaining until a date */
export const daysRemaining = (endDate) => {
  if (!endDate) return 0;
  const end = endDate instanceof Date ? endDate : fromTimestamp(endDate);
  if (!end) return 0;
  const now = new Date();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
};

/** Days since a date */
export const daysSince = (d) => {
  if (!d) return Infinity;
  const date = d instanceof Date ? d : fromTimestamp(d);
  if (!date) return Infinity;
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
};

/** Get the competition week number (1-based) from a date relative to start */
export const getCompWeek = (date, startDate) => {
  const d = date instanceof Date ? date : fromTimestamp(date);
  const s = startDate instanceof Date ? startDate : fromTimestamp(startDate);
  if (!d || !s) return 1;
  const diff = d - s;
  return Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
};

/** Get ISO week number for a date */
export const getISOWeek = (d) => {
  const date = new Date(d instanceof Date ? d : fromTimestamp(d));
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
};

/** Check if a date falls within the Sat 06:00 - Sun 23:59 weigh-in window */
export const isInWeighInWindow = (date) => {
  const d = date instanceof Date ? date : fromTimestamp(date);
  if (!d) return false;
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = d.getHours();
  if (day === 6 && hour >= 6) return true; // Saturday from 06:00
  if (day === 0) return true; // All Sunday (until 23:59)
  return false;
};

/** Get the "weigh-in week" identifier for a given date (Sat-Sun window)
 *  Returns a string like "2025-W12" for grouping weekend weigh-ins */
export const getWeighInWeek = (date, startDate) => {
  const d = date instanceof Date ? date : fromTimestamp(date);
  if (!d) return null;
  // Find the Saturday of this weekend
  const day = d.getDay();
  const saturday = new Date(d);
  if (day === 0) {
    saturday.setDate(saturday.getDate() - 1);
  }
  saturday.setHours(0, 0, 0, 0);
  return getCompWeek(saturday, startDate);
};

// ---- SCORING ----

/** Calculate percentage weight loss (positive = lost weight) */
export const calcPctLoss = (startWeight, currentWeight) => {
  if (!startWeight || !currentWeight) return 0;
  return ((startWeight - currentWeight) / startWeight) * 100;
};

/** Calculate absolute percentage change */
export const calcAbsPct = (startWeight, currentWeight) => {
  return Math.abs(calcPctLoss(startWeight, currentWeight));
};

/** Calculate normalised daily percentage loss (for weekly kudos) */
export const calcDailyPctLoss = (prevWeight, currentWeight, daysBetween) => {
  if (!prevWeight || !currentWeight || !daysBetween || daysBetween <= 0)
    return 0;
  const pctLoss = ((prevWeight - currentWeight) / prevWeight) * 100;
  return pctLoss / daysBetween;
};

// ---- SPRINT LOGIC ----

/** Default sprint config matching the spec */
export const DEFAULT_SPRINTS = [
  { number: 1, startWeek: 1, endWeek: 4, prizePercent: 15 },
  { number: 2, startWeek: 5, endWeek: 8, prizePercent: 15 },
  { number: 3, startWeek: 9, endWeek: 11, prizePercent: 15 },
];

export const OVERALL_PRIZE_PERCENT = 55;

/** Auto-calculate 3 sprints from a start and end date */
export const calculateSprintsFromDates = (startDate, endDate) => {
  const s = startDate instanceof Date ? startDate : new Date(startDate);
  const e = endDate instanceof Date ? endDate : new Date(endDate);
  const totalDays = Math.floor((e - s) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.max(3, Math.ceil(totalDays / 7));
  const base = Math.floor(totalWeeks / 3);
  const remainder = totalWeeks % 3;
  const s1 = base + (remainder >= 1 ? 1 : 0);
  const s2 = base + (remainder >= 2 ? 1 : 0);
  const s3 = totalWeeks - s1 - s2;
  return [
    { number: 1, startWeek: 1, endWeek: s1, prizePercent: 15 },
    { number: 2, startWeek: s1 + 1, endWeek: s1 + s2, prizePercent: 15 },
    { number: 3, startWeek: s1 + s2 + 1, endWeek: totalWeeks, prizePercent: 15 },
  ];
};


/** Get exact calendar date ranges for each sprint */
export const getSprintDateRanges = (startDate, sprints) => {
  const s = startDate instanceof Date ? startDate : new Date(startDate);
  return sprints.map(sprint => {
    const sprintStart = new Date(s);
    sprintStart.setDate(s.getDate() + (sprint.startWeek - 1) * 7);
    const sprintEnd = new Date(s);
    sprintEnd.setDate(s.getDate() + sprint.endWeek * 7 - 1);
    return { ...sprint, dateStart: sprintStart, dateEnd: sprintEnd };
  });
};

/** Format a date as "D Mon" e.g. "9 Mar" */
export const fmtDateShort = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/** Get weigh-in window dates for a given sprint */
export const getWeighInDates = (startDate, sprint, weighInWindow) => {
  const s = startDate instanceof Date ? startDate : new Date(startDate);
  const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const results = [];
  for (let w = sprint.startWeek; w <= sprint.endWeek; w++) {
    const weekStart = new Date(s);
    weekStart.setDate(s.getDate() + (w - 1) * 7);
    const startDay = dayMap[weighInWindow.dayStart] || 6;
    const endDay = dayMap[weighInWindow.dayEnd] || 0;
    const wiStart = new Date(weekStart);
    wiStart.setDate(weekStart.getDate() + ((startDay - weekStart.getDay() + 7) % 7));
    const wiEnd = new Date(weekStart);
    wiEnd.setDate(weekStart.getDate() + ((endDay - weekStart.getDay() + 7) % 7));
    if (wiEnd < wiStart) wiEnd.setDate(wiEnd.getDate() + 7);
    results.push({ week: w, wiStart, wiEnd, timeStart: weighInWindow.timeStart, timeEnd: weighInWindow.timeEnd });
  }
  return results;
};

/** Get next Monday from a given date (or today if it is Monday) */
export const getNextMonday = (from = new Date()) => {
  const d = new Date(from);
  const day = d.getDay();
  const daysUntilMon = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + daysUntilMon);
  return d;
};

/** Format a Date as YYYY-MM-DD for HTML date inputs */
export const toISODate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().split("T")[0];
};

/** Get which sprint a given week falls in */
export const getSprintForWeek = (week, sprints = DEFAULT_SPRINTS) => {
  return sprints.find((s) => week >= s.startWeek && week <= s.endWeek) || null;
};

/** Get the current sprint based on the current date and competition start */
export const getCurrentSprint = (startDate, sprints = DEFAULT_SPRINTS) => {
  const now = new Date();
  const week = getCompWeek(now, startDate);
  return getSprintForWeek(week, sprints);
};

/** Calculate sprint results for a given sprint.
 *  Uses shared weigh-ins only.
 *  Sprint start weight = first weigh-in in the sprint block.
 *  Sprint end weight = last weigh-in in the sprint block.
 *  Eligibility: at least 2 weigh-ins during the sprint. */
export const calcSprintResults = (
  sprint,
  players,
  weighins,
  startDate
) => {
  const results = [];

  for (const player of players) {
    const playerWeighins = weighins
      .filter((w) => w.playerId === player.id && w.shared)
      .map((w) => ({
        ...w,
        dateObj: fromTimestamp(w.date),
      }))
      .filter((w) => {
        const week = getCompWeek(w.dateObj, startDate);
        return week >= sprint.startWeek && week <= sprint.endWeek;
      })
      .sort((a, b) => a.dateObj - b.dateObj);

    if (playerWeighins.length < 2) {
      results.push({
        playerId: player.id,
        nickname: player.nickname || player.name,
        pctChange: 0,
        eligible: false,
        weighInCount: playerWeighins.length,
        startWeight: playerWeighins[0]?.weight || null,
        endWeight: playerWeighins[playerWeighins.length - 1]?.weight || null,
      });
      continue;
    }

    const sprintStart = playerWeighins[0].weight;
    const sprintEnd = playerWeighins[playerWeighins.length - 1].weight;
    const pctChange = calcPctLoss(sprintStart, sprintEnd);

    results.push({
      playerId: player.id,
      nickname: player.nickname || player.name,
      pctChange,
      eligible: true,
      weighInCount: playerWeighins.length,
      startWeight: sprintStart,
      endWeight: sprintEnd,
    });
  }

  // Sort eligible players by pct loss (highest first)
  results.sort((a, b) => {
    if (a.eligible && !b.eligible) return -1;
    if (!a.eligible && b.eligible) return 1;
    return b.pctChange - a.pctChange;
  });

  return results;
};

// ---- STREAK CALCULATION ----

/** Calculate weigh-in streak (consecutive weeks with at least one entry).
 *  Walks backwards from the current week. */
export const calcStreak = (weighinDates, startDate) => {
  if (!weighinDates || weighinDates.length === 0 || !startDate) return 0;

  const weekSet = new Set();
  weighinDates.forEach((d) => {
    const date = d instanceof Date ? d : fromTimestamp(d);
    if (date) {
      const wk = getCompWeek(date, startDate);
      weekSet.add(wk);
    }
  });

  const now = new Date();
  const currentWeek = getCompWeek(now, startDate);
  let streak = 0;

  for (let wk = currentWeek; wk >= 1; wk--) {
    if (weekSet.has(wk)) {
      streak++;
    } else if (wk < currentWeek) {
      break;
    }
  }
  return streak;
};

// ---- LEADERBOARD ----

/** Build the full leaderboard from players and weighins */
export const buildLeaderboard = (players, weighins, startDate) => {
  return players
    .map((p) => {
      const playerWeighins = weighins
        .filter((w) => w.playerId === p.id)
        .sort((a, b) => {
          const da = fromTimestamp(a.date);
          const db = fromTimestamp(b.date);
          return da - db;
        });

      const sharedWeighins = playerWeighins.filter((w) => w.shared);
      const latest = sharedWeighins[sharedWeighins.length - 1];
      const currentWeight = latest ? latest.weight : p.startWeight;
      const pctLoss = calcPctLoss(p.startWeight, currentWeight);
      const totalSharedWeighins = sharedWeighins.length;

      const lastSharedDate = latest?.date || null;
      const lastAnyDate =
        playerWeighins.length > 0
          ? playerWeighins[playerWeighins.length - 1].date
          : p.joinedAt;

      const streak = calcStreak(
        playerWeighins.map((w) => w.date),
        startDate
      );

      // Weekly window weigh-ins for kudos eligibility
      const windowWeighins = sharedWeighins.filter((w) => w.inWindow);

      return {
        ...p,
        currentWeight,
        pctLoss,
        totalSharedWeighins,
        lastSharedDate,
        lastAnyDate,
        streak,
        windowWeighins,
        allWeighins: playerWeighins,
        sharedWeighins,
      };
    })
    .sort((a, b) => b.pctLoss - a.pctLoss);
};

// ---- WALL OF SHAME ----

/** Get players who haven't weighed in for 7+ days */
export const getWallOfShame = (players, weighins) => {
  return players
    .map((p) => {
      const playerWeighins = weighins
        .filter((w) => w.playerId === p.id)
        .sort((a, b) => {
          const da = fromTimestamp(a.date);
          const db = fromTimestamp(b.date);
          return da - db;
        });

      const lastDate =
        playerWeighins.length > 0
          ? fromTimestamp(playerWeighins[playerWeighins.length - 1].date)
          : fromTimestamp(p.joinedAt);

      const days = daysSince(lastDate);
      return {
        ...p,
        daysSinceWeighIn: days,
        lastWeighIn: lastDate,
      };
    })
    .filter((p) => p.daysSinceWeighIn >= 7)
    .sort((a, b) => b.daysSinceWeighIn - a.daysSinceWeighIn);
};

// ---- WEEKLY KUDOS ----

/** Calculate weekly kudos winner from shared weekend weigh-ins.
 *  Uses normalised % loss per day since previous weigh-in.
 *  Only includes players who weighed in during the weekend window. */
export const calcWeeklyKudos = (players, weighins, compWeek, startDate) => {
  const results = [];

  for (const player of players) {
    const playerWeighins = weighins
      .filter((w) => w.playerId === player.id && w.shared)
      .map((w) => ({ ...w, dateObj: fromTimestamp(w.date) }))
      .sort((a, b) => a.dateObj - b.dateObj);

    // Find this week's in-window weigh-in (last one if multiple)
    const thisWeekWindowWIs = playerWeighins.filter((w) => {
      const wk = getCompWeek(w.dateObj, startDate);
      return wk === compWeek && w.inWindow;
    });

    if (thisWeekWindowWIs.length === 0) continue;

    const current = thisWeekWindowWIs[thisWeekWindowWIs.length - 1];

    // Find previous weigh-in (any shared one before this week)
    const previousWIs = playerWeighins.filter(
      (w) => w.dateObj < current.dateObj
    );
    if (previousWIs.length === 0) continue;

    const previous = previousWIs[previousWIs.length - 1];
    const daysBetween = Math.max(
      1,
      Math.round((current.dateObj - previous.dateObj) / (1000 * 60 * 60 * 24))
    );

    const dailyPctLoss = calcDailyPctLoss(
      previous.weight,
      current.weight,
      daysBetween
    );

    results.push({
      playerId: player.id,
      nickname: player.nickname || player.name,
      dailyPctLoss,
      pctLoss: calcPctLoss(previous.weight, current.weight),
      daysBetween,
      currentWeight: current.weight,
      previousWeight: previous.weight,
    });
  }

  return results.sort((a, b) => b.dailyPctLoss - a.dailyPctLoss);
};

// ---- CONSOLATION PRIZES ----

/** Calculate end-of-competition consolation awards */
export const calcConsolationPrizes = (players, weighins, totalWeeks, startDate) => {
  const awards = [];

  // Most Consistent: weighed in every weekend
  const weeklyPresence = {};
  players.forEach((p) => {
    weeklyPresence[p.id] = new Set();
    const pWi = weighins.filter(
      (w) => w.playerId === p.id && w.inWindow && w.shared
    );
    pWi.forEach((w) => {
      const d = fromTimestamp(w.date);
      if (d) weeklyPresence[p.id].add(getCompWeek(d, startDate));
    });
  });

  const perfectAttendance = players.filter(
    (p) => weeklyPresence[p.id]?.size >= totalWeeks
  );
  if (perfectAttendance.length > 0) {
    awards.push({
      title: "Most Consistent",
      icon: "📅",
      players: perfectAttendance.map((p) => p.nickname || p.name),
      desc: `Weighed in every single weekend. ${perfectAttendance.length > 1 ? "Shared honour." : "Absolute machine."}`,
    });
  }

  // Biggest Single Week Drop
  let biggestDrop = { playerId: null, pct: 0 };
  players.forEach((p) => {
    const pWi = weighins
      .filter((w) => w.playerId === p.id && w.shared)
      .map((w) => ({ ...w, dateObj: fromTimestamp(w.date) }))
      .sort((a, b) => a.dateObj - b.dateObj);
    for (let i = 1; i < pWi.length; i++) {
      const pct = calcPctLoss(pWi[i - 1].weight, pWi[i].weight);
      if (pct > biggestDrop.pct) {
        biggestDrop = {
          playerId: p.id,
          nickname: p.nickname || p.name,
          pct,
        };
      }
    }
  });
  if (biggestDrop.playerId) {
    awards.push({
      title: "Biggest Single Week Drop",
      icon: "📉",
      players: [biggestDrop.nickname],
      desc: `${biggestDrop.pct.toFixed(1)}% in one go. One glorious moment.`,
    });
  }

  // Most Improved (biggest rank improvement from lowest-ever position)
  // This requires historical rank tracking - simplified: compare earliest rank to final
  const leaderboard = buildLeaderboard(players, weighins, startDate);
  // For simplicity, track "most improved" as biggest jump in the final ranking
  // vs the mid-competition low point (approximated)

  // Wooden Spoon
  if (leaderboard.length > 1) {
    const last = leaderboard[leaderboard.length - 1];
    awards.push({
      title: "Wooden Spoon",
      icon: "🥄",
      players: [last.nickname || last.name],
      desc: "Dead last. Pure shame.",
    });
  }

  return awards;
};

// ---- MONDAY ROUND-UP ----

/** Generate Monday round-up data for the previous week */
export const generateRoundUp = (
  players,
  weighins,
  competition,
  compWeek
) => {
  const startDate = competition.startDate;
  const prevWeek = compWeek - 1;
  if (prevWeek < 1) return null;

  // Weekly kudos for previous week
  const kudos = calcWeeklyKudos(players, weighins, prevWeek, startDate);

  // Who didn't weigh in
  const weighedIn = new Set(kudos.map((k) => k.playerId));
  const absent = players.filter((p) => !weighedIn.has(p.id));

  // Current leaderboard
  const leaderboard = buildLeaderboard(players, weighins, startDate);

  // Current sprint
  const sprint = getSprintForWeek(compWeek, competition.sprints || DEFAULT_SPRINTS);

  return {
    weekNumber: prevWeek,
    winner: kudos.length > 0 ? kudos[0] : null,
    loser: kudos.length > 1 ? kudos[kudos.length - 1] : null,
    absent: absent.map((p) => p.nickname || p.name),
    leaderboard,
    currentSprint: sprint,
    sprintLeader: sprint
      ? calcSprintResults(sprint, players, weighins, startDate)[0]
      : null,
  };
};
