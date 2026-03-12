// ============================================================
// CAT FUNTS TBL v3 – Main App Component
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import  {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

import  {
  db, auth, onAuthChange, signInWithGoogle, signInWithPhone,
  logOut, getCompetitionByCode, createCompetition, updateCompetition,
  createPlayer, getPlayerByAuthUid, addWeighin, updateWeighin, deleteWeighin,
  updatePlayer, listenToPlayers, listenToWeighins, listenToCompetition,
  setSprintResult, getSprintResults, fromTimestamp, toTimestamp,
  getUserCompetition, setUserCompetition,
} from "./firebase.js";

import {
  toKg, fromKg, fmtWeight, validateWeight, fmtDate, fmtDateFull,
  daysRemaining, daysSince, getCompWeek, isInWeighInWindow,
  calcPctLoss, calcAbsPct, calcDailyPctLoss,
  DEFAULT_SPRINTS, OVERALL_PRIZE_PERCENT, getSprintForWeek,
  getCurrentSprint, calcSprintResults, calcStreak,
  buildLeaderboard, getWallOfShame, calcWeeklyKudos,
  generateRoundUp, calcConsolationPrizes,
  calculateSprintsFromDates, getNextMonday, toISODate,
  isPlayerGhost,
} from "./utils.js";

import {
  getWeighInReaction, getComparisonCommentary,
  getAbsentMessage, getSprintWinMessage, getSprintLoseMessage,
} from "./banter.js";

import {
  S, COLOURS, unitBtnStyle, navBtnStyle, lbRowStyle,
  lbRankStyle, pctStyle, paidBtnStyle, PLAYER_COLOURS,
} from "./styles.js";

import ShareButtons from "./components/ShareButtons.jsx";

// ---- HELPERS ----

const makeId = () => Math.random().toString(36).substring(2, 9);

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  // ---- AUTH STATE ----
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [authError, setAuthError] = useState("");

  // ---- APP STATE ----
  const [competition, setCompetition] = useState(null);
  const [compId, setCompId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [weighins, setWeighins] = useState([]);
  const [sprintResults, setSprintResultsState] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [view, setView] = useState("home");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [banterLine, setBanterLine] = useState("");
  const [comparisonLine, setComparisonLine] = useState("");

  // ---- FORM STATE ----
  const [formName, setFormName] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formCode, setFormCode] = useState("");
  const [formStartDate, setFormStartDate] = useState(() => toISODate(getNextMonday()));
  const [formEndDate, setFormEndDate] = useState(() => {
    const d = getNextMonday(); d.setDate(d.getDate() + 11 * 7); return toISODate(d);
  });
  const [formBuyIn, setFormBuyIn] = useState("20");
  const [formNewWeight, setFormNewWeight] = useState("");
  const [formNewUnit, setFormNewUnit] = useState("kg");
  const [formNote, setFormNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ---- ADMIN FORM STATE ----
  const [adminStartDate, setAdminStartDate] = useState("");
  const [adminEndDate, setAdminEndDate] = useState("");
  const [adminBuyIn, setAdminBuyIn] = useState("");
  const [adminCurrency, setAdminCurrency] = useState("£");
  const [adminDayStart, setAdminDayStart] = useState("Saturday");
  const [adminTimeStart, setAdminTimeStart] = useState("06:00");
  const [adminDayEnd, setAdminDayEnd] = useState("Sunday");
  const [adminTimeEnd, setAdminTimeEnd] = useState("23:59");

  // ---- TOAST HELPER ----
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // ---- AUTH LISTENER ----
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ---- LOAD COMPETITION (localStorage first, then Firestore users collection) ----
  useEffect(() => {
    if (!authUser) return;
    const savedCompId = localStorage.getItem("fc:compId");
    if (savedCompId) {
      setCompId(savedCompId);
    } else {
      // Cross-device: check Firestore users collection for this auth UID
      getUserCompetition(authUser.uid).then((cId) => {
        if (cId) {
          setCompId(cId);
          localStorage.setItem("fc:compId", cId);
        }
      }).catch((err) => console.error("Failed to load user competition:", err));
    }
  }, [authUser]);

  // ---- REAL-TIME LISTENERS ----
  useEffect(() => {
    if (!compId) return;
    const unsubs = [];
    unsubs.push(listenToCompetition(compId, (c) => setCompetition(c)));
    unsubs.push(listenToPlayers(compId, (p) => setPlayers(p)));
    unsubs.push(listenToWeighins(compId, (w) => setWeighins(w)));

    // Load sprint results once
    getSprintResults(compId).then((r) => setSprintResultsState(r));

    return () => unsubs.forEach((u) => u());
  }, [compId]);

  // ---- FIND CURRENT PLAYER ----
  useEffect(() => {
    if (!authUser || !players.length) {
      setCurrentPlayer(null);
      return;
    }
    const me = players.find((p) => p.authUid === authUser.uid);
    if (me) {
      setCurrentPlayer(me);
      setFormNewUnit(me.preferredUnit || "kg");
      if (view === "home" || view === "join" || view === "auth") {
        setView("dashboard");
      }
    }
  }, [authUser, players]);

  // ---- DETERMINE INITIAL VIEW ----
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setView("auth");
    } else if (!compId) {
      setView("home");
    } else if (currentPlayer) {
      if (view === "home" || view === "auth" || view === "join") {
        setView("dashboard");
      }
    } else if (compId && !currentPlayer) {
      setView("join");
    }
  }, [authLoading, authUser, compId, currentPlayer]);

  // ---- DERIVED DATA ----
  const me = currentPlayer;
  const myUnit = me?.preferredUnit || "kg";
  const startDate = competition?.startDate;
  const isAdmin = me && competition && competition.createdBy === me.authUid;

  const leaderboard = useMemo(
    () => (competition ? buildLeaderboard(players, weighins, startDate) : []),
    [players, weighins, competition, startDate]
  );

  const myRank = useMemo(
    () => (me ? leaderboard.findIndex((p) => p.id === me.id) : -1),
    [leaderboard, me]
  );

  const myData = useMemo(
    () => (me ? leaderboard.find((p) => p.id === me.id) : null),
    [leaderboard, me]
  );

  const wallOfShame = useMemo(
    () => getWallOfShame(players, weighins),
    [players, weighins]
  );

  const totalPot = useMemo(() => {
    if (!competition) return 0;
    return players.filter((p) => p.paid).length * (competition.buyIn || 0);
  }, [players, competition]);

  const daysLeft = useMemo(
    () => daysRemaining(competition?.endDate),
    [competition]
  );

  const currentWeek = useMemo(
    () => (startDate ? getCompWeek(new Date(), startDate) : 1),
    [startDate]
  );

  const currentSprint = useMemo(
    () => getSprintForWeek(currentWeek, competition?.sprints || DEFAULT_SPRINTS),
    [currentWeek, competition]
  );

  // ---- AUTH HANDLERS ----
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      setAuthError("");
    } catch (e) {
      setAuthError(e.message || "Google sign-in failed.");
    }
  };

  const handlePhoneSend = async () => {
    try {
      const result = await signInWithPhone(phoneNumber, "recaptcha-container");
      setConfirmResult(result);
      setAuthError("");
    } catch (e) {
      setAuthError(e.message || "Failed to send code. Check the number.");
    }
  };

  const handlePhoneVerify = async () => {
    try {
      await confirmResult.confirm(verificationCode);
      setAuthError("");
    } catch (e) {
      setAuthError("Wrong code. Try again.");
    }
  };

  // ---- CREATE COMPETITION ----
  const handleCreate = async () => {
    if (!formName.trim()) return setError("Name's empty. Who are you?");
    
    if (!formCode.trim()) return setError("You need an invite code. Make one up.");

    const code = formCode.trim().toUpperCase();
    const existing = await getCompetitionByCode(code);
    if (existing) return setError("That code's taken. Pick another.");

    const buyIn = parseFloat(formBuyIn) || 0;
    const startDt = new Date(formStartDate + "T00:00:00");
    const endDt = new Date(formEndDate + "T23:59:59");
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) return setError("Invalid dates.");
    if (endDt <= startDt) return setError("End date must be after start date.");

    const compData = {
      code,
      startDate: toTimestamp(startDt),
      endDate: toTimestamp(endDt),
      buyIn,
      currency: "£",
      sprints: calculateSprintsFromDates(startDt, endDt),
      overallPrizePercent: OVERALL_PRIZE_PERCENT,
      weighInWindow: {
        dayStart: "Saturday", timeStart: "06:00",
        dayEnd: "Sunday", timeEnd: "23:59",
      },
      maxPlayers: 8,
      createdBy: authUser.uid,
    };

    const newCompId = await createCompetition(compData);
    const playerId = makeId();
    

    await createPlayer(newCompId, playerId, {
      name: formName.trim(),
      nickname: formNickname.trim() || formName.trim(),
     
      preferredUnit: formUnit,
      paid: false,
      authUid: authUser.uid,
      status: "pending",
      weeklyStreak: 0,
    });

    

    // Write to users collection for cross-device support
    await setUserCompetition(authUser.uid, newCompId);

    setCompId(newCompId);
    localStorage.setItem("fc:compId", newCompId);
    setError("");
    setView("dashboard");
  };

  // ---- JOIN COMPETITION ----
  const handleJoin = async () => {
    if (!formName.trim()) return setError("Name's empty. Who are you?");
    if (!formCode.trim()) return setError("You need the invite code. Ask your mates.");

    const comp = await getCompetitionByCode(formCode.trim().toUpperCase());
    if (!comp) return setError("No competition with that code. Check with your mates.");

    // Check if already joined
    const existing = await getPlayerByAuthUid(comp.id, authUser.uid);
    if (existing) {
      setCompId(comp.id);
      localStorage.setItem("fc:compId", comp.id);
      await setUserCompetition(authUser.uid, comp.id);
      setError("");
      return;
    }

    const playerId = makeId();

    await createPlayer(comp.id, playerId, {
      name: formName.trim(),
      nickname: formNickname.trim() || formName.trim(),
      preferredUnit: formUnit,
      paid: false,
      authUid: authUser.uid,
      status: "pending",
      weeklyStreak: 0,
    });

    // Write to users collection for cross-device support
    await setUserCompetition(authUser.uid, comp.id);

    setCompId(comp.id);
    localStorage.setItem("fc:compId", comp.id);
    setError("");
    setView("dashboard");
  };

  // ---- LOG WEIGH-IN ----
  const handleWeighIn = async (shareNow) => {
    if (!formNewWeight) return setError("Put a number on the scales.");
    const wErr = validateWeight(formNewWeight, formNewUnit);
    if (wErr) return setError(wErr);
    if (!me || !compId) return;

    const weightKg = toKg(formNewWeight, formNewUnit);
    const now = new Date();
    const inWindow = isInWeighInWindow(now);
    const weekNum = getCompWeek(now, startDate);

    // ---- START WEIGHT LOCKING LOGIC ----
    const lockDate = startDate ? fromTimestamp(startDate) : new Date("2099-01-01");
    const isPending = !me.startWeight || me.status === "pending";

    if (isPending) {
      // First weigh-in ever: set startWeight and activate
      const upd = { startWeight: weightKg, status: "active" };
      if (now >= lockDate) upd.startWeightLockedAt = now;
      await updatePlayer(compId, me.id, upd);
    } else if (!me.startWeightLockedAt && now < lockDate) {
      // Before lock date, no lock yet: overwrite startWeight (latest wins)
      await updatePlayer(compId, me.id, { startWeight: weightKg });
    } else if (!me.startWeightLockedAt && now >= lockDate) {
      // Past lock date, first weigh-in after it: lock now (don't change startWeight)
      await updatePlayer(compId, me.id, { startWeightLockedAt: now });
    }
    // If startWeightLockedAt already set: startWeight is immutable

    // Determine if this is a first weigh-in (beyond starting weight)
    const myWeighins = weighins.filter((w) => w.playerId === me.id);
    const isFirst = myWeighins.length <= 1 || isPending;

    // Calculate pct change from previous
    const prevShared = myWeighins
      .filter((w) => w.shared)
      .sort((a, b) => fromTimestamp(a.date) - fromTimestamp(b.date));
    const prevWeight = prevShared.length > 0
      ? prevShared[prevShared.length - 1].weight
      : (me.startWeight || weightKg);
    const pctFromPrev = calcPctLoss(prevWeight, weightKg);

    await addWeighin(compId, {
      playerId: me.id,
      weight: weightKg,
      shared: shareNow,
      note: formNote.trim(),
      weekNumber: weekNum,
      inWindow,
    });

    // Generate banter
    const reaction = getWeighInReaction({
      name: me.nickname || me.name,
      pct: Math.abs(pctFromPrev),
      signed: pctFromPrev,
      weight: fmtWeight(weightKg, myUnit),
      isFirstWeighIn: isFirst,
    });
    setBanterLine(reaction);

    // Generate comparison (after a tick so leaderboard updates)
    setTimeout(() => {
      const lb = buildLeaderboard(players, [...weighins, {
        playerId: me.id, weight: weightKg, shared: shareNow,
        date: now, inWindow, weekNumber: weekNum,
      }], startDate);
      const rank = lb.findIndex((p) => p.id === me.id);
      const leader = lb[0];
      const ahead = rank > 0 ? lb[rank - 1] : null;
      const behind = rank < lb.length - 1 ? lb[rank + 1] : null;

      if (shareNow && lb.length > 1) {
        const comp = getComparisonCommentary({
          name: me.nickname || me.name,
          rank: rank + 1,
          total: lb.length,
          pct: (calcPctLoss(me.startWeight, weightKg) || 0).toFixed(1),
          leader: leader?.nickname || leader?.name || "",
          leadPct: leader?.pctLoss?.toFixed(1) || "0",
          diff: (Math.abs((leader?.pctLoss || 0) - (calcPctLoss(me.startWeight, weightKg) || 0)) || 0).toFixed(1),
          aheadName: ahead?.nickname || ahead?.name || "",
          behindName: behind?.nickname || behind?.name || "",
          gap: ahead ? (Math.abs((ahead.pctLoss || 0) - (calcPctLoss(me.startWeight, weightKg) || 0)) || 0).toFixed(1) : "0",
          oldRank: myRank + 1,
          newRank: rank + 1,
          overtakenName: "",
          overtakerName: "",
          weeks: "1",
        });
        setComparisonLine(comp);
      }
    }, 500);

    setFormNewWeight("");
    setFormNote("");
    setError("");

    if (shareNow) {
      showToast("Weigh-in shared! Nowhere to hide now. 🎯");
    } else {
      showToast("Logged privately. Share when you're ready (or brave enough).");
    }

    setView("banter");
  };

  // ---- ADMIN: POPULATE FORM ----
  useEffect(() => {
    if (view === "admin" && competition) {
      const sd = fromTimestamp(competition.startDate);
      const ed = fromTimestamp(competition.endDate);
      if (sd) setAdminStartDate(toISODate(sd));
      if (ed) setAdminEndDate(toISODate(ed));
      setAdminBuyIn(String(competition.buyIn ?? ""));
      setAdminCurrency((competition.currency || "£").replace("Â", ""));
      const w = competition.weighInWindow || {};
      setAdminDayStart(w.dayStart || "Saturday");
      setAdminTimeStart(w.timeStart || "06:00");
      setAdminDayEnd(w.dayEnd || "Sunday");
      setAdminTimeEnd(w.timeEnd || "23:59");
    }
  }, [view, competition]);

  // ---- ADMIN: SAVE SETTINGS ----
  const handleAdminUpdate = async () => {
    if (!compId || !isAdmin) return;
    const sd = new Date(adminStartDate + "T00:00:00");
    const ed = new Date(adminEndDate + "T23:59:59");
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return setError("Invalid dates.");
    if (ed <= sd) return setError("End date must be after start date.");

    const newSprints = calculateSprintsFromDates(sd, ed);
    await updateCompetition(compId, {
      startDate: toTimestamp(sd),
      endDate: toTimestamp(ed),
      buyIn: parseFloat(adminBuyIn) || 0,
      currency: adminCurrency || "£",
      sprints: newSprints,
      weighInWindow: {
        dayStart: adminDayStart,
        timeStart: adminTimeStart,
        dayEnd: adminDayEnd,
        timeEnd: adminTimeEnd,
      },
    });
    showToast("Settings saved.");
    setError("");
    setView("dashboard");
  };

  // ---- SHARE A PRIVATE WEIGH-IN ----
  const shareWeighIn = async (weighinId) => {
    if (!compId) return;
    await updateWeighin(compId, weighinId, { shared: true });
    showToast("Shared! Let them see it. 👀");
  };

  // ---- DELETE A WEIGH-IN ----
  const handleDelete = async (weighinId, note) => {
    if (note === "Starting weight") {
      showToast("Can't delete your starting weight. That's sacred.");
      setConfirmDelete(null);
      return;
    }
    if (!compId) return;
    await deleteWeighin(compId, weighinId);
    setConfirmDelete(null);
    showToast("Weigh-in deleted. Like it never happened. 🗑️");
  };

  // ---- TOGGLE PAID ----
  const togglePaid = async (playerId) => {
    if (!compId) return;
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    await updatePlayer(compId, playerId, { paid: !player.paid });
  };

  // ---- WHATSAPP MESSAGE GENERATORS ----
  const genPersonalMsg = () => {
    if (!me || !myData) return "";
    const pct = myData.pctLoss;
    const dir = pct > 0 ? "down" : pct < 0 ? "up" : "unchanged";
    const emoji = pct > 0 ? "📉🔥" : pct < 0 ? "📈🍔" : "😐";
    const banter = banterLine || "";
    return `⚖️ FAT CUNTS ⚖️\n${banter ? banter + "\n" : ""}\n${me.nickname}: ${Math.abs(pct || 0).toFixed(1)}% total ${dir} ${emoji}\n📊 ${myRank + 1}/${players.length} on the board\n⏱️ ${daysLeft} days to go`;
  };

  const genLeaderboardMsg = () => {
    if (leaderboard.length === 0) return "";
    let msg = `📋 FAT CUNTS – WEEK ${currentWeek} 📋\n\n`;
    leaderboard.forEach((p, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const dir = (p.pctLoss || 0) > 0 ? "↓" : p.pctLoss < 0 ? "↑" : "–";
      msg += `${medal} ${p.nickname}: ${(p.pctLoss || 0) !== 0 ? `${Math.abs(p.pctLoss || 0).toFixed(1)}% ${dir}` : "no change"}\n`;
    });
    if (currentSprint) {
      msg += `\nSprint ${currentSprint.number}: Week ${currentSprint.startWeek}–${currentSprint.endWeek}`;
    }
    msg += `\n${daysLeft} days left. ${(competition?.currency || "£").replace("Â", "")}${totalPot} in the pot. 💰`;
    return msg;
  };

  const genSprintMsg = (sprint, results) => {
    if (!results || results.length === 0) return "";
    const winner = results.find((r) => r.eligible);
    if (!winner) return "";
    return `🚨 FAT CUNTS – SPRINT ${sprint.number} RESULT 🚨\n\n👑 ${winner.nickname} takes it! ${(winner.pctChange || 0).toFixed(1)}% lost.\nPockets £${Math.round(totalPot * sprint.prizePercent / 100)}.\n\nSprint ${sprint.number + 1} starts now. All to play for.`;
  };

  // ---- MY CHART DATA ----
  const myChartData = useMemo(() => {
    if (!me) return [];
    const myWi = weighins
      .filter((w) => w.playerId === me.id)
      .sort((a, b) => fromTimestamp(a.date) - fromTimestamp(b.date));
    return myWi.map((w) => ({
      date: fmtDate(w.date),
      weight: parseFloat((fromKg(w.weight, myUnit) || 0).toFixed(1)),
      shared: w.shared,
      id: w.id,
    }));
  }, [weighins, me, myUnit]);

  // ---- ALL PLAYERS CHART ----
  const allChartData = useMemo(() => {
    if (!competition || players.length === 0) return [];
    const sharedWi = weighins.filter((w) => w.shared);
    const allDates = [...new Set(sharedWi.map((w) => fmtDate(w.date)))];

    return allDates.map((date) => {
      const point = { date };
      players.forEach((p) => {
        const pWi = sharedWi
          .filter((w) => w.playerId === p.id && fmtDate(w.date) === date)
          .sort((a, b) => fromTimestamp(a.date) - fromTimestamp(b.date));
        if (pWi.length > 0 && p.startWeight) {
          const latest = pWi[pWi.length - 1];
          point[p.nickname || p.name] = parseFloat(
            (calcPctLoss(p.startWeight, latest.weight) || 0).toFixed(1)
          );
        }
      });
      return point;
    });
  }, [weighins, players, competition]);

  // ---- SPRINT DATA ----
  const currentSprintResults = useMemo(() => {
    if (!currentSprint || !competition) return [];
    return calcSprintResults(currentSprint, players, weighins, startDate);
  }, [currentSprint, players, weighins, startDate, competition]);

  const allSprintData = useMemo(() => {
    if (!competition) return [];
    const sprints = competition.sprints || DEFAULT_SPRINTS;
    return sprints.map((s) => ({
      sprint: s,
      results: calcSprintResults(s, players, weighins, startDate),
      weeksLeft: Math.max(0, s.endWeek - currentWeek + 1),
      isActive: currentWeek >= s.startWeek && currentWeek <= s.endWeek,
      isComplete: currentWeek > s.endWeek,
    }));
  }, [competition, players, weighins, startDate, currentWeek]);

  // ---- ROUND-UP ----
  const roundUp = useMemo(() => {
    if (!competition || !players.length) return null;
    return generateRoundUp(players, weighins, competition, currentWeek);
  }, [competition, players, weighins, currentWeek]);

  // ============================================================
  // RENDER
  // ============================================================

  // ---- LOADING ----
  if (authLoading) {
    return (
      <div style={S.app}>
        <div style={S.noise} />
        <div style={{ ...S.container, textAlign: "center", paddingTop: 100 }}>
          <div style={S.title}>Cat Funts TBL</div>
          <div style={{ color: COLOURS.dim, marginTop: 20 }}>Loading the damage...</div>
        </div>
      </div>
    );
  }

  // ---- AUTH VIEW ----
  if (!authUser) {
    return (
      <div style={S.app}>
        <div style={S.noise} />
        <div style={S.container}>
          <div style={S.title}>Cat Funts TBL</div>
          <div style={S.subtitle}>The Reckoning</div>
          {authError && <div style={S.errorMsg}>{authError}</div>}

          <div style={S.card}>
            <div style={S.cardTitle}>Sign In</div>
            <button style={S.btnPrimary} onClick={handleGoogleSignIn}>
              Sign in with Google
            </button>
            <div style={{ ...S.divider }} />
            <div style={{ fontSize: 12, color: COLOURS.dim, textAlign: "center", marginBottom: 12 }}>
              Or use your phone number
            </div>
            {!confirmResult ? (
              <>
                <input
                  style={S.input}
                  placeholder="Phone (+44 7xxx...)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                />
                <button style={S.btnSecondary} onClick={handlePhoneSend}>
                  Send Code
                </button>
              </>
            ) : (
              <>
                <input
                  style={S.input}
                  placeholder="Verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  type="number"
                />
                <button style={S.btnSecondary} onClick={handlePhoneVerify}>
                  Verify
                </button>
              </>
            )}
          </div>
          <div id="recaptcha-container" />
        </div>
      </div>
    );
  }

  // ---- HOME VIEW (authenticated, no competition) ----
  if (view === "home" && !compId) {
    return (
      <div style={S.app}>
        <div style={S.noise} />
        <div style={S.container}>
          <div style={S.title}>Cat Funts TBL</div>
          <div style={S.subtitle}>The Reckoning</div>
          <button style={S.btnPrimary} onClick={() => setView("create")}>
            Start a Competition
          </button>
          <button style={S.btnSecondary} onClick={() => setView("join")}>
            Join with Code
          </button>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button style={S.btnGhost} onClick={logOut}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- CREATE VIEW ----
  if (view === "create") {
    return (
      <div style={S.app}>
        <div style={S.noise} />
        <div style={S.container}>
          <div style={S.title}>Cat Funts TBL</div>
          <div style={S.subtitle}>New Competition</div>
          {error && <div style={S.errorMsg}>{error}</div>}
          <div style={S.card}>
            <div style={S.cardTitle}>Your Details</div>
            <input style={S.input} placeholder="Your name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <input style={S.input} placeholder="Nickname (optional)" value={formNickname} onChange={(e) => setFormNickname(e.target.value)} />
            <div style={S.unitToggle}>
              {["kg", "lbs", "st"].map((u) => (
                <button key={u} style={unitBtnStyle(formUnit === u)} onClick={() => setFormUnit(u)}>{u}</button>
              ))}
            </div>
            
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Competition Setup</div>
            <input style={S.input} placeholder="Invite code (e.g. FATCLUB)" value={formCode} onChange={(e) => setFormCode(e.target.value)} maxLength={12} />
            <div style={{ fontSize: 12, color: COLOURS.faint, marginTop: 8, marginBottom: 4 }}>Start date</div>
            <input style={S.input} type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
            <div style={{ fontSize: 12, color: COLOURS.faint, marginTop: 8, marginBottom: 4 }}>End date</div>
            <input style={S.input} type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
            <input style={{ ...S.input, marginTop: 12 }} placeholder="Buy-in (£ per person)" type="number" value={formBuyIn} onChange={(e) => setFormBuyIn(e.target.value)} />
          </div>
          <button style={S.btnPrimary} onClick={handleCreate}>Let's F***ing Go</button>
          <button style={S.btnGhost} onClick={() => { setView("home"); setError(""); }}>← Back</button>
        </div>
      </div>
    );
  }

  // ---- JOIN VIEW ----
  if (view === "join") {
    return (
      <div style={S.app}>
        <div style={S.noise} />
        <div style={S.container}>
          <div style={S.title}>Cat Funts TBL</div>
          <div style={S.subtitle}>Join the Pain</div>
          {error && <div style={S.errorMsg}>{error}</div>}
          <div style={S.card}>
            <div style={S.cardTitle}>Your Details</div>
            <input style={S.input} placeholder="Your name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <input style={S.input} placeholder="Nickname (optional)" value={formNickname} onChange={(e) => setFormNickname(e.target.value)} />
            <div style={S.unitToggle}>
              {["kg", "lbs", "st"].map((u) => (
                <button key={u} style={unitBtnStyle(formUnit === u)} onClick={() => setFormUnit(u)}>{u}</button>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Invite Code</div>
            <input style={S.input} placeholder="Enter code from your mate" value={formCode} onChange={(e) => setFormCode(e.target.value)} maxLength={12} />
          </div>
          <button style={S.btnPrimary} onClick={handleJoin}>I'm In, Let's Go</button>
          <button style={S.btnGhost} onClick={() => { setView("home"); setError(""); }}>← Back</button>
        </div>
      </div>
    );
  }

  // ---- BANTER VIEW (after weigh-in) ----
  if (view === "banter") {
    return (
      <div style={S.app}>
        <div style={S.noise} />
        <div style={S.container}>
          <div style={S.titleSmall}>Cat Funts TBL</div>
          <div style={S.subtitle}>The Verdict</div>
          {banterLine && <div style={S.banterBox}>{banterLine}</div>}
          {comparisonLine && (
            <div style={{ ...S.banterBox, fontSize: 13, color: COLOURS.dim }}>
              {comparisonLine}
            </div>
          )}
          <ShareButtons message={genPersonalMsg()} whatsappLabel="Share Update" copyLabel="Copy" />
          <button style={S.btnPrimary} onClick={() => { setView("dashboard"); setBanterLine(""); setComparisonLine(""); }}>
            See the Leaderboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD VIEWS (tabbed)
  // ============================================================

  return (
    <div style={S.app}>
      <div style={S.noise} />
      <div style={S.container}>
        {/* Toast */}
        {toast && <div style={S.toast}>{toast}</div>}

        {/* Header */}
        <div style={S.titleSmall}>Cat Funts TBL</div>
        <div style={S.subtitle}>
          {competition?.code} • {daysLeft} days left
          {myData?.streak >= 2 && (
            <span style={{ color: COLOURS.gold, marginLeft: 8 }}>🔗 {myData.streak}wk</span>
          )}
        </div>

        {/* Navigation */}
        <div style={S.nav}>
          {(isAdmin ? ["dashboard", "weighin", "stats", "sprints", "charts", "pot", "admin"] : ["dashboard", "weighin", "stats", "sprints", "charts", "pot"]).map((v) => (
            <button key={v} style={navBtnStyle(view === v)} onClick={() => setView(v)}>
              {v === "dashboard" ? "Board" : v === "weighin" ? "Weigh In" : v === "stats" ? "My Stats" : v === "sprints" ? "Sprints" : v === "charts" ? "Charts" : v === "pot" ? "Pot" : "⚙"}
            </button>
          ))}
        </div>

        {/* ============ LEADERBOARD ============ */}
        {view === "dashboard" && (
          <>
            {/* Pending weight card for ghost players */}
            {myData?.isGhost && (
              <div style={{ ...S.card, border: `1px solid ${COLOURS.primary}`, padding: "16px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLOURS.primary, marginBottom: 8 }}>Set Your Starting Weight</div>
                <div style={{ fontSize: 13, color: COLOURS.dim, marginBottom: 12 }}>
                  Log your first weigh-in to join the fight.
                  {startDate && new Date() < fromTimestamp(startDate) && (
                    <span> You can update it until <strong style={{ color: COLOURS.light }}>{fmtDateFull(fromTimestamp(startDate))}</strong>.</span>
                  )}
                </div>
                <button style={S.btnPrimary} onClick={() => setView("weighin")}>
                  Log Your Weight Now
                </button>
              </div>
            )}

            {/* Stats bar */}
            <div style={{ ...S.card, display: "flex", gap: 8 }}>
              <div style={S.statBox}>
                <div style={S.statVal}>{leaderboard.filter((p) => !p.isGhost).length}/{players.length}</div>
                <div style={S.statLabel}>Active</div>
              </div>
              <div style={S.statBox}>
                <div style={S.statVal}>{daysLeft}</div>
                <div style={S.statLabel}>Days Left</div>
              </div>
              <div style={S.statBox}>
                <div style={S.statVal}>{(competition?.currency || "£").replace("Â", "")}{totalPot}</div>
                <div style={S.statLabel}>Prize Pot</div>
              </div>
            </div>

            {/* Sprint indicator */}
            {currentSprint && (
              <div style={{ ...S.card, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: COLOURS.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>
                  🏁 Sprint {currentSprint.number}
                </span>
                <span style={{ fontSize: 11, color: COLOURS.dim }}>
                  Weeks {currentSprint.startWeek}–{currentSprint.endWeek} • {Math.max(0, currentSprint.endWeek - currentWeek + 1)} wks left
                </span>
              </div>
            )}

            {/* Leaderboard */}
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <div style={{ ...S.cardTitle, padding: "16px 16px 10px" }}>Leaderboard</div>
              {(() => {
                let activeRank = 0;
                return leaderboard.map((p) => {
                  if (!p.isGhost) activeRank++;
                  const rank = p.isGhost ? null : activeRank;
                  return (
                    <div key={p.id} style={{ ...lbRowStyle(me && p.id === me.id, rank ? rank - 1 : 99), ...(p.isGhost ? { opacity: 0.4 } : {}) }}>
                      <div style={lbRankStyle(rank ? rank - 1 : 99)}>{rank || "–"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>
                          {p.nickname || p.name}
                          {me && p.id === me.id && (
                            <span style={{ color: COLOURS.primary, fontSize: 11, marginLeft: 6 }}>YOU</span>
                          )}
                          {!p.isGhost && p.streak >= 3 && (
                            <span style={{ color: COLOURS.gold, fontSize: 11, marginLeft: 6 }}>🔗{p.streak}</span>
                          )}
                          {p.isGhost && (
                            <span style={S.ghostBadge}>Awaiting weight</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: COLOURS.faint, marginTop: 2 }}>
                          {p.isGhost
                            ? "Set your starting weight to join the fight"
                            : `${p.totalSharedWeighins} weigh-in${p.totalSharedWeighins !== 1 ? "s" : ""} • ${p.lastSharedDate ? fmtDate(p.lastSharedDate) : "no updates"}`}
                        </div>
                      </div>
                      <div style={p.isGhost ? { color: COLOURS.faint, fontSize: 15, fontWeight: 700 } : pctStyle(p.pctLoss)}>
                        {p.isGhost ? "–" : ((p.pctLoss || 0) !== 0 ? `${Math.abs(p.pctLoss || 0).toFixed(1)}%` : "–")}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Trash talk */}
            {myData && (
              <div style={S.banterBox}>
                {(() => {
                  if (myData.isGhost) return "Get your weight in to claim your place! 💪";
                  const rank = myRank;
                  const total = leaderboard.filter((p) => !p.isGhost).length;
                  const pct = myData.pctLoss;
                  if (total <= 1) return "Billy no mates over here...";
                  if (pct === 0) return "Still on the sofa then?";
                  if (rank === 0 && pct > 5) return "Absolutely cruising. They can smell the fear. 👑";
                  if (rank === 0) return "Top of the pile, you absolute machine 💪";
                  if (rank === 1) return "Snapping at the leader's heels 🐕";
                  if (rank === total - 1) return "Bringing up the rear. Classic. 🐌";
                  if (myData.streak >= 4) return `${myData.streak}-week streak though. Respect the grind. 🔗`;
                  return "Middle of the pack. Could go either way 🤷";
                })()}
              </div>
            )}

            {/* Wall of Shame */}
            {wallOfShame.length > 0 && (
              <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                <div style={{ ...S.cardTitle, padding: "16px 16px 10px" }}>🫣 Wall of Shame</div>
                <div style={{ padding: "0 16px 6px", fontSize: 11, color: COLOURS.faint }}>
                  Dodging the scales? We see you.
                </div>
                {wallOfShame.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontWeight: 600 }}>{p.nickname || p.name}</span>
                    <span style={{ color: p.daysSinceWeighIn >= 14 ? COLOURS.red : COLOURS.gold, fontWeight: 700, fontSize: 13 }}>
                      {p.daysSinceWeighIn}d ago
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Share buttons */}
            <ShareButtons message={genPersonalMsg()} whatsappLabel="My Update" copyLabel="Copy" />
            <ShareButtons message={genLeaderboardMsg()} whatsappLabel="Leaderboard" copyLabel="Copy" />
          </>
        )}

        {/* ============ WEIGH-IN ============ */}
        {view === "weighin" && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Step on the Scales</div>
              {error && <div style={S.errorMsg}>{error}</div>}
              <div style={S.unitToggle}>
                {["kg", "lbs", "st"].map((u) => (
                  <button key={u} style={unitBtnStyle(formNewUnit === u)} onClick={() => setFormNewUnit(u)}>{u}</button>
                ))}
              </div>
              <input
                style={S.inputLarge}
                placeholder="0.0"
                type="number"
                step="0.1"
                value={formNewWeight}
                onChange={(e) => setFormNewWeight(e.target.value)}
              />
              <input
                style={{ ...S.input, fontSize: 13 }}
                placeholder="Note (optional – e.g. post-curry, pre-run)"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                maxLength={60}
              />
              <div style={{ fontSize: 12, color: COLOURS.faint, textAlign: "center", marginTop: 8 }}>
                Start: {myData ? fmtWeight(myData.startWeight, myUnit) : "–"} • Last: {myData ? fmtWeight(myData.currentWeight, myUnit) : "–"} • Change: {myData ? `${(myData.pctLoss || 0) >= 0 ? "+" : ""}${(myData.pctLoss || 0).toFixed(1)}%` : "–"}
              </div>
              {isInWeighInWindow(new Date()) && (
                <div style={{ fontSize: 11, color: COLOURS.green, textAlign: "center", marginTop: 6 }}>
                  ✓ Within the weekend weigh-in window
                </div>
              )}
            </div>
            <button style={S.btnPrimary} onClick={() => handleWeighIn(true)}>
              Share it – I've got nothing to hide
            </button>
            <button style={S.btnSecondary} onClick={() => handleWeighIn(false)}>
              Log Privately (coward mode)
            </button>
          </>
        )}

        {/* ============ MY STATS ============ */}
        {view === "stats" && (
          <>
            {/* Progress chart */}
            <div style={S.card}>
              <div style={S.cardTitle}>Your Journey (of Shame)</div>
              {myChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={myChartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLOURS.faint }} />
                    <YAxis tick={{ fontSize: 10, fill: COLOURS.faint }} domain={["auto", "auto"]} width={45} tickFormatter={(v) => `${v}${myUnit}`} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12, color: COLOURS.text }} formatter={(v) => [`${v}${myUnit}`, "Weight"]} />
                    <Line type="monotone" dataKey="weight" stroke={COLOURS.primary} strokeWidth={2} dot={{ fill: COLOURS.primary, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", color: COLOURS.faint, padding: 30 }}>
                  One weigh-in so far. Get on those scales again.
                </div>
              )}
            </div>

            {/* Sprint performance */}
            <div style={S.card}>
              <div style={S.cardTitle}>Sprint Performance</div>
              {allSprintData.map((sd) => {
                const myResult = sd.results.find((r) => r.playerId === me?.id);
                return (
                  <div key={sd.sprint.number} style={S.row}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        Sprint {sd.sprint.number}
                        {sd.isActive && <span style={{ color: COLOURS.gold, marginLeft: 8, fontSize: 10 }}>ACTIVE</span>}
                        {sd.isComplete && <span style={{ color: COLOURS.green, marginLeft: 8, fontSize: 10 }}>DONE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: COLOURS.faint, marginTop: 2 }}>
                        Wks {sd.sprint.startWeek}–{sd.sprint.endWeek} • {sd.sprint.prizePercent}% of pot
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {myResult?.eligible ? (
                        <span style={pctStyle(myResult.pctChange)}>
                          {(myResult.pctChange || 0) > 0 ? "+" : ""}{(myResult.pctChange || 0).toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: COLOURS.dim }}>
                          {myResult ? `${myResult.weighInCount}/2 weigh-ins` : "–"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weigh-in history */}
            <div style={S.card}>
              <div style={S.cardTitle}>Weigh-in History</div>
              {me && weighins.filter((w) => w.playerId === me.id).length === 0 && (
                <div style={{ textAlign: "center", color: COLOURS.faint, padding: 20 }}>
                  Nothing here. The scales are waiting.
                </div>
              )}
              {me && weighins
                .filter((w) => w.playerId === me.id)
                .sort((a, b) => fromTimestamp(b.date) - fromTimestamp(a.date))
                .map((w) => {
                  const isStarting = w.note === "Starting weight";
                  return (
                    <div key={w.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ flex: 1 }}>
                        <div>
                          <span style={{ fontWeight: 700 }}>{fmtWeight(w.weight, myUnit)}</span>
                          <span style={{ color: COLOURS.faint, fontSize: 12, marginLeft: 8 }}>{fmtDate(w.date)}</span>
                          {w.shared ? <span style={S.sharedBadge}>shared</span> : <span style={S.privateBadge}>private</span>}
                          {w.inWindow && <span style={S.windowBadge}>weekend</span>}
                        </div>
                        {w.note && (
                          <div style={{ fontSize: 11, color: COLOURS.dim, marginTop: 3, fontStyle: "italic" }}>{w.note}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!w.shared && <button style={S.btnSmall} onClick={() => shareWeighIn(w.id)}>Share</button>}
                        {!isStarting && (
                          confirmDelete === w.id ? (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button style={S.btnDanger} onClick={() => handleDelete(w.id, w.note)}>Confirm</button>
                              <button style={{ ...S.btnSmall, color: COLOURS.dim, borderColor: COLOURS.subtle }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button style={{ ...S.btnSmall, color: COLOURS.dim, borderColor: COLOURS.subtle, background: "transparent" }} onClick={() => setConfirmDelete(w.id)}>🗑️</button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {/* ============ SPRINTS ============ */}
        {view === "sprints" && (
          <>
            {/* Prize structure */}
            <div style={S.card}>
              <div style={S.cardTitle}>Prize Structure</div>
              {(competition?.sprints || DEFAULT_SPRINTS).map((s) => (
                <div key={s.number} style={{ ...S.row, justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>Sprint {s.number} (Wks {s.startWeek}–{s.endWeek})</span>
                  <span style={{ color: COLOURS.gold, fontWeight: 700 }}>
                    {s.prizePercent}% • {(competition?.currency || "£").replace("Â", "")}{Math.round(totalPot * s.prizePercent / 100)}
                  </span>
                </div>
              ))}
              <div style={{ ...S.row, justifyContent: "space-between", borderBottom: "none" }}>
                <span style={{ fontWeight: 600 }}>Overall Champion</span>
                <span style={{ color: COLOURS.gold, fontWeight: 700 }}>
                  {OVERALL_PRIZE_PERCENT}% • {(competition?.currency || "£").replace("Â", "")}{Math.round(totalPot * OVERALL_PRIZE_PERCENT / 100)}
                </span>
              </div>
            </div>

            {/* Sprint details */}
            {allSprintData.map((sd) => (
              <div key={sd.sprint.number} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={S.cardTitle}>
                    Sprint {sd.sprint.number}
                    {sd.isActive && <span style={{ color: COLOURS.gold, fontSize: 10, marginLeft: 8 }}>ACTIVE</span>}
                    {sd.isComplete && <span style={{ color: COLOURS.green, fontSize: 10, marginLeft: 8 }}>COMPLETE</span>}
                  </div>
                  {sd.isActive && (
                    <span style={{ fontSize: 11, color: COLOURS.dim }}>{sd.weeksLeft} wk{sd.weeksLeft !== 1 ? "s" : ""} left</span>
                  )}
                </div>
                {sd.results.map((r, i) => (
                  <div key={r.playerId} style={lbRowStyle(me && r.playerId === me.id, i)}>
                    <div style={lbRankStyle(i)}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {r.nickname}
                        {!r.eligible && <span style={{ color: COLOURS.dim, fontSize: 10, marginLeft: 6 }}>INELIGIBLE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: COLOURS.faint, marginTop: 2 }}>
                        {r.weighInCount} weigh-in{r.weighInCount !== 1 ? "s" : ""} this sprint
                      </div>
                    </div>
                    <div style={pctStyle(r.pctChange)}>
                      {r.eligible ? `${(r.pctChange || 0) > 0 ? "+" : ""}${(r.pctChange || 0).toFixed(1)}%` : "–"}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* ============ CHARTS ============ */}
        {view === "charts" && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Everyone's % Change</div>
              <div style={{ fontSize: 11, color: COLOURS.faint, marginBottom: 12 }}>
                Shared weigh-ins only. Positive = weight lost.
              </div>
              {allChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={allChartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLOURS.faint }} />
                    <YAxis tick={{ fontSize: 10, fill: COLOURS.faint }} width={40} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12, color: COLOURS.text }} formatter={(v, name) => [`${v}%`, name]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: COLOURS.muted }} />
                    {players.map((p, i) => (
                      <Line
                        key={p.id}
                        type="monotone"
                        dataKey={p.nickname || p.name}
                        stroke={PLAYER_COLOURS[i % PLAYER_COLOURS.length]}
                        strokeWidth={me && p.id === me.id ? 3 : 1.5}
                        dot={{ fill: PLAYER_COLOURS[i % PLAYER_COLOURS.length], r: 3 }}
                        strokeDasharray={me && p.id === me.id ? "0" : "5 5"}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", color: COLOURS.faint, padding: 30 }}>
                  Not enough data yet. Everyone needs to weigh in.
                </div>
              )}
            </div>

            {/* Player summaries */}
            <div style={S.card}>
              <div style={S.cardTitle}>Player Summaries</div>
              {leaderboard.map((p, i) => (
                <div key={p.id} style={S.row}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: PLAYER_COLOURS[i % PLAYER_COLOURS.length], marginRight: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {p.nickname || p.name}
                      {me && p.id === me.id && <span style={{ color: COLOURS.primary, fontSize: 10, marginLeft: 6 }}>YOU</span>}
                    </div>
                    <div style={{ fontSize: 11, color: COLOURS.faint, marginTop: 2 }}>
                      {fmtWeight(p.startWeight, p.preferredUnit || "kg")} → {fmtWeight(p.currentWeight, p.preferredUnit || "kg")} • {p.totalSharedWeighins} weigh-in{p.totalSharedWeighins !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={pctStyle(p.pctLoss)}>
                    {(p.pctLoss || 0) !== 0 ? `${(p.pctLoss || 0) > 0 ? "+" : ""}${(p.pctLoss || 0).toFixed(1)}%` : "–"}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ============ PRIZE POT ============ */}
        {view === "pot" && (
          <>
            <div style={S.card}>
              <div style={S.statBox}>
                <div style={{ ...S.statVal, fontSize: 42 }}>{(competition?.currency || "£").replace("Â", "")}{totalPot}</div>
                <div style={S.statLabel}>Total Pot</div>
                <div style={{ color: COLOURS.faint, fontSize: 12, marginTop: 8 }}>
                  {(competition?.currency || "£").replace("Â", "")}{competition?.buyIn || 0} per person
                </div>
              </div>
            </div>

            {/* Prize breakdown */}
            <div style={S.card}>
              <div style={S.cardTitle}>Prize Split</div>
              {(competition?.sprints || DEFAULT_SPRINTS).map((s) => (
                <div key={s.number} style={{ ...S.row, justifyContent: "space-between" }}>
                  <span>Sprint {s.number}</span>
                  <span style={{ color: COLOURS.gold, fontWeight: 700 }}>
                    {(competition?.currency || "£").replace("Â", "")}{Math.round(totalPot * s.prizePercent / 100)}
                  </span>
                </div>
              ))}
              <div style={{ ...S.row, justifyContent: "space-between", borderBottom: "none" }}>
                <span style={{ fontWeight: 700 }}>Overall Champion</span>
                <span style={{ color: COLOURS.gold, fontWeight: 900 }}>
                  {(competition?.currency || "£").replace("Â", "")}{Math.round(totalPot * OVERALL_PRIZE_PERCENT / 100)}
                </span>
              </div>
            </div>

            {/* Payment tracker */}
            <div style={S.card}>
              <div style={S.cardTitle}>Payment Tracker</div>
              {players.map((p) => (
                <div key={p.id} style={{ ...S.row, justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{p.nickname || p.name}</span>
                  <button style={paidBtnStyle(p.paid)} onClick={() => togglePaid(p.id)}>
                    {p.paid ? "✓ Paid" : "✗ Unpaid"}
                  </button>
                </div>
              ))}
            </div>

            {/* Current leaders */}
            {leaderboard.length > 0 && leaderboard[0].pctLoss > 0 && (
              <div style={{ ...S.card, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: COLOURS.dim, textTransform: "uppercase", letterSpacing: 2 }}>Overall Leader</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: COLOURS.gold, marginTop: 6 }}>{leaderboard[0].nickname || leaderboard[0].name}</div>
                <div style={{ fontSize: 14, color: COLOURS.muted, marginTop: 4 }}>
                  {(leaderboard[0].pctLoss || 0).toFixed(1)}% lost – pocketing {(competition?.currency || "£").replace("Â", "")}{Math.round(totalPot * OVERALL_PRIZE_PERCENT / 100)} if it holds
                </div>
              </div>
            )}

            {players.filter((p) => !p.paid).length > 0 && (
              <div style={{ ...S.banterBox, fontSize: 13 }}>
                {players.filter((p) => !p.paid).length} player{players.filter((p) => !p.paid).length !== 1 ? "s" : ""} still haven't paid. You know who you are.
              </div>
            )}
          </>
        )}

        {/* ============ ADMIN SETTINGS ============ */}
        {view === "admin" && isAdmin && (
          <>
            {error && <div style={S.errorMsg}>{error}</div>}
            <div style={S.card}>
              <div style={S.cardTitle}>Competition Dates</div>
              <div style={{ fontSize: 12, color: COLOURS.faint, marginBottom: 4 }}>Start date</div>
              <input style={S.input} type="date" value={adminStartDate} onChange={(e) => setAdminStartDate(e.target.value)} />
              <div style={{ fontSize: 12, color: COLOURS.faint, marginTop: 8, marginBottom: 4 }}>End date</div>
              <input style={S.input} type="date" value={adminEndDate} onChange={(e) => setAdminEndDate(e.target.value)} />
              {adminStartDate && adminEndDate && (
                <div style={{ fontSize: 11, color: COLOURS.dim, marginTop: 8, textAlign: "center" }}>
                  {Math.ceil((new Date(adminEndDate) - new Date(adminStartDate)) / (7 * 24 * 60 * 60 * 1000))} weeks
                  {" · "}Sprints: {calculateSprintsFromDates(adminStartDate, adminEndDate).map((s) => `${s.startWeek}–${s.endWeek}`).join(", ")}
                </div>
              )}
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Money</div>
              <div style={{ fontSize: 12, color: COLOURS.faint, marginBottom: 4 }}>Buy-in per person</div>
              <input style={S.input} type="number" value={adminBuyIn} onChange={(e) => setAdminBuyIn(e.target.value)} />
              <div style={{ fontSize: 12, color: COLOURS.faint, marginTop: 8, marginBottom: 4 }}>Currency symbol</div>
              <input style={S.input} value={adminCurrency} onChange={(e) => setAdminCurrency(e.target.value)} maxLength={3} />
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Weigh-in Window</div>
              <div style={{ fontSize: 12, color: COLOURS.faint, marginBottom: 4 }}>Opens</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select style={{ ...S.input, flex: 1 }} value={adminDayStart} onChange={(e) => setAdminDayStart(e.target.value)}>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input style={{ ...S.input, flex: 1 }} type="time" value={adminTimeStart} onChange={(e) => setAdminTimeStart(e.target.value)} />
              </div>
              <div style={{ fontSize: 12, color: COLOURS.faint, marginTop: 8, marginBottom: 4 }}>Closes</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select style={{ ...S.input, flex: 1 }} value={adminDayEnd} onChange={(e) => setAdminDayEnd(e.target.value)}>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input style={{ ...S.input, flex: 1 }} type="time" value={adminTimeEnd} onChange={(e) => setAdminTimeEnd(e.target.value)} />
              </div>
            </div>
            <button style={S.btnPrimary} onClick={handleAdminUpdate}>Save Settings</button>
            <button style={S.btnGhost} onClick={() => { setError(""); setView("dashboard"); }}>Cancel</button>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 30, paddingBottom: 20 }}>
          {isAdmin && view !== "admin" && <div style={{ fontSize: 10, color: COLOURS.subtle, marginBottom: 8 }}>You're the admin (competition creator)</div>}
          <button style={S.btnGhost} onClick={() => { localStorage.removeItem("fc:compId"); setCompId(null); setView("home"); }}>
            Leave Competition
          </button>
          <button style={S.btnGhost} onClick={logOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
