import { useEffect, useRef, useState } from "react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import packCommon from "@assets/file_00000000f72071f4976ebe28dc47fcba_1778302993378.png";
import packRare from "@assets/file_000000004af072439879b16c71615233_1778302993458.png";
import packLegendary from "@assets/file_000000001b2071f4982abfe3bea19ef8_1778302993471.png";
import imgPirate    from "@assets/1778314678638_1778314817602.png";
import imgAngel     from "@assets/1778314370527_1778314817692.png";
import imgCrypto    from "@assets/1778310741770_1778314817713.png";
import imgGym       from "@assets/file_00000000b83c71f4b76f841fd454d122_1778314817740.png";
import imgGangster  from "@assets/1778310721201_1778314817789.png";
import imgTrump     from "@assets/file_0000000070d871f4899fc854a6d893bf_1778314817820.png";
import imgCossack   from "@assets/1778305540817_1778314817848.png";
import imgRealMadrid from "@assets/file_000000002de8720a8aa92dc51de4d69b_1778314817878.png";
import "./rada.css";

const PACK_IMAGES: Record<string, string> = {
  rada: packCommon,
  frogg: packRare,
  froggii: packLegendary,
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready(): void;
        expand(): void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        openLink?(url: string): void;
        openTelegramLink?(url: string): void;
        showAlert?(msg: string): void;
        HapticFeedback?: { impactOccurred(style: string): void };
        colorScheme?: string;
        themeParams?: { bg_color?: string };
        BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void };
      };
    };
  }
}

const tg = () => window.Telegram?.WebApp;
const tgUser = () => tg()?.initDataUnsafe?.user;

type Tab = "shop" | "catalog" | "create" | "top" | "profile";

interface CardTemplate {
  tplId: string;
  name: string;
  img: string;
  rarity: "common" | "rare" | "legendary";
  pts: number;
}

const ALL_CARDS: CardTemplate[] = [
  { tplId: "pirate",     name: "Пірат Жаб",    img: imgPirate,     rarity: "common",    pts: 3  },
  { tplId: "angel",      name: "Янгол Жаб",    img: imgAngel,      rarity: "common",    pts: 3  },
  { tplId: "crypto",     name: "Крипто Жаб",   img: imgCrypto,     rarity: "common",    pts: 3  },
  { tplId: "gym",        name: "Качок Жаб",    img: imgGym,        rarity: "common",    pts: 3  },
  { tplId: "gangster",   name: "Гангстер Жаб", img: imgGangster,   rarity: "rare",      pts: 6  },
  { tplId: "trump",      name: "Трамп Жаб",    img: imgTrump,      rarity: "rare",      pts: 6  },
  { tplId: "cossack",    name: "Козак Жаб",    img: imgCossack,    rarity: "legendary", pts: 20 },
  { tplId: "realmadrid", name: "Легенда Жаб",  img: imgRealMadrid, rarity: "legendary", pts: 20 },
];

const PACK_RATES: Record<string, { common: number; rare: number; legendary: number }> = {
  rada:    { common: 87, rare: 11, legendary: 2  },
  frogg:   { common: 47, rare: 45, legendary: 8  },
  froggii: { common: 25, rare: 55, legendary: 20 },
};

function drawCard(packType: string): CardTemplate {
  const rates = PACK_RATES[packType] ?? PACK_RATES.rada;
  const roll = Math.random() * 100;
  const rarity: "common" | "rare" | "legendary" =
    roll < rates.legendary ? "legendary"
    : roll < rates.legendary + rates.rare ? "rare"
    : "common";
  const pool = ALL_CARDS.filter(c => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

const PK_PRICE: Record<string, number> = { rada: 0.07, frogg: 0.15, froggii: 0.3 };
const PK_NAME: Record<string, string> = { rada: "Rada Pack", frogg: "Frogg", froggii: "Froggii" };
const STARS_PRICE: Record<string, number> = { test: 10, rada: 12, frogg: 25, froggii: 40 };
const TOPUP_WALLET = "UQBbfis8IFeVHBP81VcZkNutKK4XBNi1lSZTu21kdix_buId";

interface Pack { id: string; name: string; link: string; isPrem: boolean; isPublic: boolean; }
interface Card { id: string; name: string; img: string; rate: number; rarity: string; pts: number; active: boolean; }

interface State {
  pts: number;
  ton: number;
  stars: number;
  wallet: string | null;
  packs: Pack[];
  cards: Card[];
  stickersUsed: number;
  topMode: "s" | "p";
  payMode: "ton" | "stars";
}

const loadState = (): State => {
  try {
    const s = localStorage.getItem("rs_state");
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed.cards) parsed.cards = parsed.cards.filter((c: Card) => c.img);
      return { ...defaultState(), ...parsed };
    }
  } catch {}
  return defaultState();
};

const defaultState = (): State => ({
  pts: 0, ton: 0, stars: 100, wallet: null,
  packs: [], cards: [], stickersUsed: 0, topMode: "s", payMode: "ton",
});

function toast(msg: string) {
  const el = document.createElement("div");
  el.className = "rs-toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 2800);
}

const FROG_EMOJIS = Array(12).fill(0).map(() => "🐸");

const SPARKS_BASE = [
  { tx: "-80px", ty: "-130px", delay: "0ms" },
  { tx: "90px", ty: "-110px", delay: "50ms" },
  { tx: "-125px", ty: "-50px", delay: "100ms" },
  { tx: "135px", ty: "-65px", delay: "75ms" },
  { tx: "-70px", ty: "95px", delay: "150ms" },
  { tx: "85px", ty: "105px", delay: "25ms" },
  { tx: "5px", ty: "-155px", delay: "200ms" },
  { tx: "-155px", ty: "15px", delay: "125ms" },
  { tx: "155px", ty: "5px", delay: "175ms" },
  { tx: "-25px", ty: "155px", delay: "225ms" },
  { tx: "55px", ty: "-125px", delay: "250ms" },
  { tx: "-110px", ty: "125px", delay: "300ms" },
];

export default function RadaStickersMiniApp() {
  const [tonUI] = useTonConnectUI();
  const address = useTonAddress();
  const [tab, setTab] = useState<Tab>("shop");
  const [state, setState] = useState<State>(loadState);
  const [modal, setModal] = useState<string | null>(null);
  const [chipFilter, setChipFilter] = useState("all");
  const [buyType, setBuyType] = useState<string>("");
  const [openingCard, setOpeningCard] = useState<Card | null>(null);
  const [openPhase, setOpenPhase] = useState<0 | 1 | 2 | 3>(0);
  const [openingPackType, setOpeningPackType] = useState<string>("rada");
  const [createStep, setCreateStep] = useState(1);
  const [createData, setCreateData] = useState({ isPrem: false, link: "", name: "", photo: null as string | null, isPublic: false });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [topMode, setTopMode] = useState<"s" | "p">("s");
  const [payMode, setPayMode] = useState<"ton" | "stars">("ton");
  const [previewPack, setPreviewPack] = useState<string | null>(null);
  const [topupTab, setTopupTab] = useState<"ton" | "stars">("ton");
  const [topupAmount, setTopupAmount] = useState("");

  useEffect(() => {
    tg()?.ready();
    tg()?.expand();
  }, []);

  useEffect(() => {
    localStorage.setItem("rs_state", JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (address && address !== state.wallet) {
      setState(s => ({ ...s, wallet: address }));
      toast("✅ Гаманець підключено!");
    } else if (!address && state.wallet) {
      setState(s => ({ ...s, wallet: null }));
    }
  }, [address]);

  const shortAddr = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`;

  const connectWallet = () => tonUI.openModal();
  const disconnectWallet = () => tonUI.disconnect();

  const sendTopupTON = async () => {
    if (!address) { toast("Підключіть гаманець!"); return; }
    const amt = parseFloat(topupAmount);
    if (!amt || amt < 0.01) { toast("Мінімум 0.01 TON"); return; }
    try {
      await tonUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: TOPUP_WALLET, amount: String(Math.floor(amt * 1e9)) }],
      });
      setState(s => ({ ...s, ton: s.ton + amt }));
      toast(`✅ +${amt} TON зараховано!`);
      setTopupAmount("");
      setModal(null);
    } catch {
      toast("❌ Транзакцію скасовано");
    }
  };

  const openPackAnimation = (packType: string, tpl: CardTemplate) => {
    const card: Card = { id: "c" + Date.now(), name: tpl.name, img: tpl.img, rate: tpl.pts, rarity: tpl.rarity, pts: tpl.pts, active: false };
    setOpeningCard(card);
    setOpeningPackType(packType);
    setOpenPhase(0);
    setModal("packopen");
    setPreviewPack(null);
  };

  const buyPack = (type: string) => {
    if (!address) { toast("Спочатку підключіть гаманець!"); setModal("wallet"); setPreviewPack(null); return; }
    if (state.ton < PK_PRICE[type]) { toast("Недостатньо TON!"); return; }
    setState(s => ({ ...s, ton: s.ton - PK_PRICE[type] }));
    openPackAnimation(type, drawCard(type));
  };

  const buyWithStars = (type: string) => {
    const price = STARS_PRICE[type];
    if (state.stars < price) { toast("Недостатньо зірок!"); return; }
    setState(s => ({ ...s, stars: s.stars - price }));
    openPackAnimation(type === "test" ? "rada" : type, drawCard(type === "test" ? "rada" : type));
  };

  const handlePackTap = () => {
    if (openPhase !== 0) return;
    tg()?.HapticFeedback?.impactOccurred("medium");
    setOpenPhase(1);
    setTimeout(() => setOpenPhase(2), 680);
    setTimeout(() => setOpenPhase(3), 1550);
  };

  const finishOpen = () => {
    if (!openingCard) return;
    const activeCnt = state.cards.filter(c => c.active).length;
    const card: Card = { ...openingCard, active: activeCnt < 3 };
    setState(s => ({
      ...s,
      cards: [...s.cards, card],
      pts: s.pts + openingCard.pts,
    }));
    setModal(null);
    toast("🎁 Картку отримано!");
  };

  const toggleCard = (id: string, on: boolean) => {
    setState(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, active: on } : c) }));
    setModal(null);
    toast(on ? "⚡ Активовано!" : "Деактивовано");
  };

  const saveCreate = () => {
    if (!createData.name.trim()) { toast("Введіть назву"); return; }
    const pk: Pack = {
      id: "pk" + Date.now(),
      name: createData.name,
      link: createData.link,
      isPrem: createData.isPrem,
      isPublic: createData.isPublic,
    };
    setState(s => ({ ...s, packs: [...s.packs, pk], pts: s.pts + 50, stickersUsed: s.stickersUsed + 5 }));
    setModal(null);
    toast("🎉 Пак збережено! +50 балів");
  };

  const catalogPacks: Pack[] = [
    ...state.packs.filter(p => p.isPublic),
  ];

  const activeCards = state.cards.filter(c => c.active);

  return (
    <div className="rs-app">
      <div className="fbg">
        <div className="fl">{FROG_EMOJIS.map((e, i) => <span key={i}>{e}</span>)}</div>
        <div className="fl">{FROG_EMOJIS.map((e, i) => <span key={i}>{e}</span>)}</div>
      </div>
      <div className="bglow" />

      {/* HEADER */}
      <header className="hdr">
        <div className="logo">RadaStickers</div>
        <button
          className={`tc-btn${address ? " on" : ""}`}
          onClick={address ? () => setModal("walletInfo") : connectWallet}
        >
          <div className="tc-dot" />
          {address ? shortAddr(address) : "TON Connect"}
        </button>
      </header>

      {/* CONTENT */}
      <div className="main">
        {/* SHOP */}
        {tab === "shop" && (
          <div className="page active">
            <div className="shop-hero">
              <div className="shop-hero-t">🐸 Магазин паків</div>
              <div className="shop-hero-s">Купуй пакети карток та заробляй бали</div>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {["ton", "stars"].map(m => (
                <button
                  key={m}
                  className={`pay-tab ${m}${payMode === m ? " on" : ""}`}
                  onClick={() => setPayMode(m as "ton" | "stars")}
                >
                  {m === "ton" ? "▼ TON" : "⭐ Stars"}
                </button>
              ))}
            </div>

            <div className="packs-list">
              {(["rada", "frogg", "froggii"] as const).map(type => (
                <div key={type} className={`pk ${type}`}>
                  <div className="pk-l">
                    <img src={PACK_IMAGES[type]} alt={PK_NAME[type]} className="pk-img" />
                  </div>
                  <div className="pk-r">
                    <div className="pk-name">{PK_NAME[type]}</div>
                    <div className="pk-desc">
                      {type === "rada" && "Базовий пак · Common картки · 3 рандомних"}
                      {type === "frogg" && "Рідкісний пак · Rare картки · +мультиплаєр"}
                      {type === "froggii" && "Легендарний пак · Legendary · Ексклюзив"}
                    </div>
                    <div className="pk-row">
                      {payMode === "ton"
                        ? <div className="pk-price">▼ {PK_PRICE[type]} TON</div>
                        : <div className="pk-price" style={{ color: "#FFD700" }}>⭐ {STARS_PRICE[type]}</div>
                      }
                      <div className="rar">
                        {type === "rada" ? "COMMON" : type === "frogg" ? "RARE" : "LEGEND"}
                      </div>
                    </div>
                    <button
                      className={payMode === "stars" ? "buy-btn-stars" : "buy-btn"}
                      onClick={() => setPreviewPack(type)}
                    >
                      {payMode === "ton" ? "Відкрити пак" : "Відкрити за Stars ⭐"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATALOG */}
        {tab === "catalog" && (
          <div className="page active">
            {catalogPacks.length === 0 ? (
              <div className="catalog-empty">
                <img src="/mini-app/frog-empty.png" alt="" className="catalog-empty-frog" />
                <div className="empty-t">Каталог порожній</div>
                <div className="empty-s">Опублікуй свій пак щоб він з'явився тут</div>
              </div>
            ) : (
              <div className="cat-grid">
                {catalogPacks.map(p => (
                  <div key={p.id} className="cat-card" onClick={() => tg()?.openTelegramLink ? tg()!.openTelegramLink!(p.link) : window.open(p.link, "_blank")}>
                    <div className="cat-cover">📦</div>
                    <div className="cat-info">
                      <div className="cat-name">{p.name}</div>
                      <div className="cat-user">@{tgUser()?.username || "me"}</div>
                      <div className="cat-cnt">{p.isPrem ? "⭐ Premium" : "Звичайний"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREATE */}
        {tab === "create" && (
          <div className="page active">
            <div className="sec">Мої паки</div>
            <div id="myPacks">
              {state.packs.length === 0 ? (
                <div className="empty" style={{ padding: "24px 0" }}>
                  <div className="empty-ico">📦</div>
                  <div className="empty-t">Паків немає</div>
                  <div className="empty-s">Натисніть «Звичайний стікер пак» щоб створити</div>
                </div>
              ) : (
                state.packs.map(p => (
                  <div key={p.id} className="my-pack-row" onClick={() => window.open(p.link, "_blank")}>
                    <div style={{ fontSize: 26 }}>📦</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--t1)" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>
                        {p.isPrem ? "⭐ Преміум · " : ""}<span style={{ color: "var(--o3)" }}>{p.link}</span>
                      </div>
                    </div>
                    <div className="arr">›</div>
                  </div>
                ))
              )}
            </div>

            <div className="sec">Створити</div>
            <div className="copt" onClick={() => { setCreateData({ isPrem: false, link: "", name: "", photo: null, isPublic: false }); setCreateStep(1); setModal("create"); }}>
              <div className="copt-ico">🎨</div>
              <div>
                <div className="copt-name">Звичайний стікер пак</div>
                <div className="copt-desc">Безкоштовно · Статичні стікери · PNG/WebP</div>
              </div>
            </div>
            <div className="copt prem" onClick={() => { setCreateData({ isPrem: true, link: "", name: "", photo: null, isPublic: false }); setCreateStep(1); setModal("create"); }}>
              <div className="copt-ico">⭐</div>
              <div>
                <div className="copt-name">Анімований пак</div>
                <div className="copt-desc">Потребує Telegram Premium · Lottie/Video</div>
                <div className="ptag">⭐ PREMIUM</div>
              </div>
            </div>

            <div className="info-box">
              <div className="info-box-t">Як це працює?</div>
              <div className="istep"><div className="inum">1</div><div className="itxt">Зверніться до <b>@RadaStickers_Bot</b> в Telegram</div></div>
              <div className="istep"><div className="inum">2</div><div className="itxt">Бот сам <b>створить ваш стікер-пак</b></div></div>
              <div className="istep"><div className="inum">3</div><div className="itxt">Вставте посилання <b>t.me/addstickers/...</b> сюди</div></div>
            </div>
          </div>
        )}

        {/* TOP */}
        {tab === "top" && (
          <div className="page active">
            <div className="top-tabs">
              {["s", "p"].map(m => (
                <div key={m} className={`ttab${topMode === m ? " on" : ""}`} onClick={() => setTopMode(m as "s" | "p")}>
                  {m === "s" ? "🎨 Стікери" : "🏆 Бали"}
                </div>
              ))}
            </div>

            {(() => {
              const myName = tgUser()?.username ? `@${tgUser()!.username}` : tgUser()?.first_name || "Ти";
              const myVal = topMode === "s" ? state.stickersUsed : state.pts;
              const myPhoto = tgUser()?.photo_url;
              const mockPlayers = [
                { name: "🥈 ???",  val: Math.max(0, myVal - 1), photo: null },
                { name: "🥉 ???",  val: Math.max(0, myVal - 2), photo: null },
              ];
              return (
                <>
                  {/* PODIUM */}
                  <div className="podium">
                    {/* 2nd place */}
                    <div className="pod-col pod-2">
                      <div className="pod-ava-wrap"><div className="pod-ava pod-ava-2">🐸</div></div>
                      <div className="pod-uname">{mockPlayers[0].name}</div>
                      <div className="pod-bar pod-bar-2">
                        <span className="pod-rank">2</span>
                        <span className="pod-score">{mockPlayers[0].val}</span>
                      </div>
                    </div>
                    {/* 1st place */}
                    <div className="pod-col pod-1">
                      <div className="pod-crown">👑</div>
                      <div className="pod-ava-wrap">
                        <div className="pod-ava pod-ava-1">
                          {myPhoto ? <img src={myPhoto} alt="" /> : "🐸"}
                        </div>
                      </div>
                      <div className="pod-uname pod-uname-1">{myName}</div>
                      <div className="pod-bar pod-bar-1">
                        <span className="pod-rank">1</span>
                        <span className="pod-score">{myVal}</span>
                      </div>
                    </div>
                    {/* 3rd place */}
                    <div className="pod-col pod-3">
                      <div className="pod-ava-wrap"><div className="pod-ava pod-ava-3">🐸</div></div>
                      <div className="pod-uname">{mockPlayers[1].name}</div>
                      <div className="pod-bar pod-bar-3">
                        <span className="pod-rank">3</span>
                        <span className="pod-score">{mockPlayers[1].val}</span>
                      </div>
                    </div>
                  </div>

                  {/* LIST */}
                  <div className="lb-wrap" style={{ marginTop: 14 }}>
                    <div className="lb-row me">
                      <div className="lb-rank">1</div>
                      <div className="lb-ava">
                        {myPhoto ? <img src={myPhoto} alt="" /> : "👤"}
                      </div>
                      <div className="lb-info">
                        <div className="lb-name">{myName}</div>
                        <div className="lb-sub">{topMode === "s" ? `${state.packs.length} паків` : `${activeCards.length} активних`}</div>
                      </div>
                      <div className="lb-val">{myVal}</div>
                    </div>
                    {mockPlayers.map((p, i) => (
                      <div key={i} className="lb-row">
                        <div className="lb-rank">{i + 2}</div>
                        <div className="lb-ava">🐸</div>
                        <div className="lb-info">
                          <div className="lb-name">{p.name}</div>
                          <div className="lb-sub">—</div>
                        </div>
                        <div className="lb-val">{p.val}</div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="page active">
            <div className="prof-hero">
              <div className="prof-ava">
                {tgUser()?.photo_url ? <img src={tgUser()!.photo_url} alt="" /> : "🐸"}
              </div>
              <div className="prof-name">{tgUser()?.first_name || "Demo"} {tgUser()?.last_name || ""}</div>
              <div className="prof-user">@{tgUser()?.username || "demo"}</div>
              <div className="pstats">
                <div className="pst"><div className="pst-v">{state.pts}</div><div className="pst-l">Балів</div></div>
                <div className="pst"><div className="pst-v">{state.packs.length}</div><div className="pst-l">Паків</div></div>
                <div className="pst"><div className="pst-v">{state.cards.length}</div><div className="pst-l">Карток</div></div>
              </div>
            </div>

            {/* Wallet */}
            {address ? (
              <div className="wallet-connected">
                <div className="wc-top">
                  <div className="wc-left">
                    <div className="wc-ico">💎</div>
                    <div>
                      <div className="wc-name">TON Гаманець</div>
                      <div className="wc-addr">{shortAddr(address)}</div>
                    </div>
                  </div>
                  <div className="wc-bal">
                    <div className="wc-val">{state.ton.toFixed(2)}</div>
                    <div className="wc-lbl">TON</div>
                  </div>
                </div>
                <div className="wc-actions">
                  <div className="wca" onClick={() => setModal("topup")}><span>⬆️</span>Поповнити</div>
                  <div className="wca" onClick={disconnectWallet}><span>🔌</span>Відключити</div>
                </div>
              </div>
            ) : (
              <div className="connect-block">
                <div className="cb-ico">💎</div>
                <div className="cb-t">Підключіть TON гаманець</div>
                <div className="cb-s">Для покупок та транзакцій в TON</div>
                <button className="btn" onClick={connectWallet}>Підключити гаманець</button>
              </div>
            )}

            {/* Cards */}
            <div className="sec">Мої картки</div>
            <div className="cards-bar">
              <div>
                <div className="cpts">{state.pts}</div>
                <div className="cpts-l">Балів</div>
              </div>
              <div className="act-badge">{activeCards.length}/3 активних</div>
            </div>

            {state.cards.length === 0 ? (
              <div className="empty" style={{ padding: "24px 0" }}>
                <div className="empty-ico">🃏</div>
                <div className="empty-t">Карток немає</div>
                <div className="empty-s">Купіть пак в магазині</div>
              </div>
            ) : (
              <div className="cgrid">
                {activeCards.map(c => (
                  <div key={c.id} className="ccard on" onClick={() => { setSelectedCard(c); setModal("card"); }}>
                    <div className="cdot" />
                    <div className="cface"><img src={c.img} alt={c.name} className="card-grid-img" /><div className="cnm">{c.name}</div><div className="crt">+{c.pts}/день</div></div>
                  </div>
                ))}
                {state.cards.filter(c => !c.active).map(c => (
                  <div key={c.id} className="ccard" onClick={() => { setSelectedCard(c); setModal("card"); }}>
                    <div className="cface"><img src={c.img} alt={c.name} className="card-grid-img" /><div className="cnm">{c.name}</div><div className="crt">+{c.pts}/день</div></div>
                  </div>
                ))}
              </div>
            )}

            <div className="psec">
              <div className="psec-t">Гаманець</div>
              <div className="prow" onClick={address ? disconnectWallet : connectWallet}>
                <div className="prow-l">
                  <div className="prow-ico">💎</div>
                  <div className="prow-txt">{address ? "Відключити TON" : "Підключити TON"}</div>
                </div>
                <div className="prow-r">
                  {address && <div className="bal-chip">{shortAddr(address)}</div>}
                  <div className="arr">›</div>
                </div>
              </div>
              <div className="prow" onClick={() => setModal("topup")}>
                <div className="prow-l"><div className="prow-ico">⬆️</div><div className="prow-txt">Поповнити TON</div></div>
                <div className="prow-r"><div className="prow-val">{state.ton.toFixed(2)} TON</div><div className="arr">›</div></div>
              </div>
              <div className="prow">
                <div className="prow-l"><div className="prow-ico">⭐</div><div className="prow-txt">Зірки</div></div>
                <div className="prow-r"><div className="prow-val">{state.stars} ⭐</div><div className="arr">›</div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className="bnav">
        {([
          ["shop", "🛍", "Магазин"],
          ["catalog", "📚", "Каталог"],
          ["create", "✨", "Створити"],
          ["top", "🏆", "Топ"],
          ["profile", "👤", "Профіль"],
        ] as [Tab, string, string][]).map(([t, ico, lbl]) => (
          <div key={t} className={`bni${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
            <div className="bni-ico">{ico}</div>
            <div className="bni-lbl">{lbl}</div>
          </div>
        ))}
      </nav>

      {/* MODALS */}

      {/* Pack open */}
      {modal === "packopen" && openingCard && (() => {
        const sparkColors =
          openingCard.rarity === "legendary"
            ? ["#CC55FF","#BB77FF","#9944EE","#DD99FF","#CC55FF","#BB77FF","#9944EE","#DD99FF","#CC55FF","#BB77FF","#9944EE","#DD99FF"]
            : openingCard.rarity === "rare"
            ? ["#00DD66","#00FF88","#00BB55","#44FF99","#00DD66","#00FF88","#00BB55","#44FF99","#00DD66","#00FF88","#00BB55","#44FF99"]
            : ["#FF8C00","#FFD700","#FF3D00","#FFAA00","#FF8C00","#FFD700","#FF3D00","#FFAA00","#FF8C00","#FFD700","#FF3D00","#FFAA00"];
        return (
          <div className="po-screen show">
            {openPhase === 2 && <div className="po-flash" />}

            {openPhase === 3 && (
              <div className="po-sparks">
                {SPARKS_BASE.map((s, i) => (
                  <div
                    key={i}
                    className="po-spark"
                    style={{ "--tx": s.tx, "--ty": s.ty, "--c": sparkColors[i], animationDelay: s.delay } as React.CSSProperties}
                  />
                ))}
              </div>
            )}

            {openPhase < 3 ? (
              <>
                <div className="po-title">
                  {openPhase === 0 ? "Відкриття паку" : openPhase === 1 ? "Відкриваємо…" : "✨"}
                </div>
                <div className={`pw${openPhase === 1 ? " shaking" : ""}`} onClick={handlePackTap}>
                  <div className="pb">
                    <img src={PACK_IMAGES[openingPackType] || packCommon} alt="" className="pack-full-img pack-body-img" />
                  </div>
                  <div className={`pl${openPhase >= 2 ? " open" : ""}`}>
                    <img src={PACK_IMAGES[openingPackType] || packCommon} alt="" className="pack-full-img pack-lid-img" />
                  </div>
                  {openPhase === 0 && <div className="po-hint">Натисніть щоб відкрити</div>}
                </div>
              </>
            ) : (
              <div className="cr-div show">
                <img
                  src={openingCard.img}
                  alt={openingCard.name}
                  className="revealed-card-img"
                  style={{ filter: openingCard.rarity === "legendary"
                    ? "drop-shadow(0 0 22px #CC55FF) drop-shadow(0 0 44px rgba(187,119,255,0.4))"
                    : openingCard.rarity === "rare"
                    ? "drop-shadow(0 0 16px #00FF88) drop-shadow(0 0 30px rgba(0,255,136,0.3))"
                    : "drop-shadow(0 0 12px rgba(255,140,0,0.7))" }}
                />
                <button className="btn" style={{ marginTop: 18, maxWidth: 240, width: "100%" }} onClick={finishOpen}>
                  Забрати картку ✦
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Wallet info */}
      {modal === "walletInfo" && (
        <Overlay onClose={() => setModal(null)}>
          <div className="mh" />
          <div className="mt">💎 Гаманець</div>
          <div className="ms">{address && shortAddr(address)}</div>
          <div style={{ background: "var(--s2)", borderRadius: "var(--rs)", padding: "13px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--t2)" }}>Баланс TON</span>
            <span style={{ fontWeight: 700, color: "var(--o3)" }}>{state.ton.toFixed(2)} TON</span>
          </div>
          <button className="btn2 btn-red" onClick={() => { disconnectWallet(); setModal(null); }}>🔌 Відключити</button>
          <button className="btn2" onClick={() => setModal(null)}>Закрити</button>
        </Overlay>
      )}

      {/* Wallet connect */}
      {modal === "wallet" && (
        <Overlay onClose={() => setModal(null)}>
          <div className="mh" />
          <div className="mt">💎 TON Гаманець</div>
          <div className="ms">Підключіть гаманець щоб купувати паки</div>
          <button className="btn" onClick={() => { connectWallet(); setModal(null); }}>Підключити TON</button>
          <button className="btn2" onClick={() => setModal(null)}>Скасувати</button>
        </Overlay>
      )}

      {/* Topup */}
      {modal === "topup" && (
        <Overlay onClose={() => setModal(null)}>
          <div className="mh" />
          <div className="mt">💰 Поповнення</div>
          <div className="tu-tabs">
            {(["ton","stars"] as const).map(t => (
              <div key={t} className={`pay-tab ${t}${topupTab===t?" on":""}`} onClick={() => setTopupTab(t)}>
                {t==="ton" ? "▼ TON" : "⭐ Stars"}
              </div>
            ))}
          </div>

          {topupTab === "ton" ? (
            !address ? (
              <div className="pwarn">⚠️ Спочатку підключіть TON гаманець</div>
            ) : (
              <>
                <div className="ms" style={{ marginBottom: 12 }}>Введіть суму в TON</div>
                <input className="inp" type="number" placeholder="0.10" min="0.01" step="0.01"
                  value={topupAmount} onChange={e => setTopupAmount(e.target.value)} style={{ marginBottom: 8 }} />
                <div className="tu-quick">
                  {[0.1, 0.5, 1, 2].map(v => (
                    <button key={v} className="tu-q-btn" onClick={() => setTopupAmount(String(v))}>{v} TON</button>
                  ))}
                </div>
                <div className="tu-addr-box">
                  <div className="tu-addr-lbl">Отримувач</div>
                  <div className="tu-addr-val">{TOPUP_WALLET.slice(0,14)}…{TOPUP_WALLET.slice(-8)}</div>
                </div>
                <button className="btn" onClick={sendTopupTON} disabled={!topupAmount || parseFloat(topupAmount) < 0.01}>
                  Відправити {topupAmount || "0"} TON ▼
                </button>
              </>
            )
          ) : (
            <>
              <div className="ms" style={{ marginBottom: 14 }}>Поповніть зірки для покупки паків</div>
              {[
                { stars: 30,  name: "Стартовий 🐸",    color: "var(--og)" },
                { stars: 80,  name: "Популярний ⭐",    color: "linear-gradient(135deg,#009955,#00DD77)" },
                { stars: 200, name: "VIP 💎",           color: "linear-gradient(135deg,#6622AA,#BB77FF)" },
              ].map(pkg => (
                <div key={pkg.stars} className="stars-pkg" onClick={() => {
                  setState(s => ({ ...s, stars: s.stars + pkg.stars }));
                  toast(`+${pkg.stars} ⭐ Stars!`); setModal(null);
                }}>
                  <div>
                    <div className="stars-pkg-val">+{pkg.stars} ⭐</div>
                    <div className="stars-pkg-name">{pkg.name}</div>
                  </div>
                  <div className="stars-pkg-btn" style={{ background: pkg.color }}>Отримати</div>
                </div>
              ))}
              <div className="tu-note">Реальне поповнення через @RadaStickers_Bot</div>
            </>
          )}

          <button className="btn2" style={{ marginTop: 10 }} onClick={() => setModal(null)}>Скасувати</button>
        </Overlay>
      )}

      {/* Create pack */}
      {modal === "create" && (
        <Overlay onClose={() => setModal(null)}>
          <div className="mh" />
          {createStep === 1 && (
            <>
              <div className="sdots">
                <div className="sd on" /><div className="sd" /><div className="sd" />
              </div>
              <div className="mt">{createData.isPrem ? "⭐ Анімований пак" : "🎨 Звичайний пак"}</div>
              <div className="ms">Крок 1: Обкладинка паку</div>
              <div className="uz" onClick={() => document.getElementById("photoInput")?.click()}>
                <div className="uz-ico">🖼️</div>
                <div className="uz-t">Натисніть щоб вибрати фото</div>
                <div className="uz-s">JPG/PNG · 512×512</div>
              </div>
              {createData.photo && <img src={createData.photo} style={{ width: "100%", aspectRatio: "1", borderRadius: "var(--r)", objectFit: "cover", marginBottom: 12, border: "2px solid var(--b2)" }} alt="" />}
              <input type="file" id="photoInput" accept="image/*" style={{ display: "none" }} onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = ev => setCreateData(d => ({ ...d, photo: ev.target?.result as string }));
                r.readAsDataURL(f);
              }} />
              <button className="btn" disabled={!createData.photo} onClick={() => setCreateStep(2)}>Далі →</button>
              <button className="btn2" onClick={() => setModal(null)}>Скасувати</button>
            </>
          )}
          {createStep === 2 && (
            <>
              <div className="sdots">
                <div className="sd dn" /><div className="sd on" /><div className="sd" />
              </div>
              <div className="mt">🔗 Посилання на пак</div>
              <div className="ms">Вставте посилання яке надіслав <span style={{ color: "var(--o3)" }}>@RadaStickers_Bot</span></div>
              <label className="lbl">Посилання t.me/addstickers/...</label>
              <input
                className="inp"
                placeholder="https://t.me/addstickers/my_pack"
                value={createData.link}
                onChange={e => setCreateData(d => ({ ...d, link: e.target.value }))}
                style={{ marginBottom: 5 }}
              />
              <div className="inp-h">Спочатку попросіть бота створити пак, потім вставте посилання сюди</div>
              <button className="btn" disabled={!createData.link.includes("t.me/addstickers/")} onClick={() => setCreateStep(3)}>Далі →</button>
              <button className="btn2" onClick={() => setCreateStep(1)}>← Назад</button>
            </>
          )}
          {createStep === 3 && (
            <>
              <div className="sdots">
                <div className="sd dn" /><div className="sd dn" /><div className="sd on" />
              </div>
              <div className="mt">📝 Назва паку</div>
              <div className="ms">Крок 3: Назва для відображення в додатку</div>
              <label className="lbl">Назва</label>
              <input
                className="inp"
                placeholder="Мої наліпки 🐸"
                maxLength={64}
                value={createData.name}
                onChange={e => setCreateData(d => ({ ...d, name: e.target.value }))}
                style={{ marginBottom: 5 }}
              />
              <div className="inp-h" style={{ marginBottom: 14 }}>До 64 символів</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 13px", background: "var(--s2)", borderRadius: "var(--rs)", marginBottom: 14 }}>
                <input type="checkbox" id="pubChk" checked={createData.isPublic} onChange={e => setCreateData(d => ({ ...d, isPublic: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "var(--o3)" }} />
                <label htmlFor="pubChk" style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", cursor: "pointer" }}>🌐 Виставити в каталог</label>
              </div>
              {createData.isPrem && <div className="pwarn">⭐ Для перегляду потрібен Telegram Premium</div>}
              <button className="btn" disabled={!createData.name.trim()} onClick={saveCreate}>Зберегти ✦</button>
              <button className="btn2" onClick={() => setCreateStep(2)}>← Назад</button>
            </>
          )}
        </Overlay>
      )}

      {/* Card detail */}
      {modal === "card" && selectedCard && (
        <Overlay onClose={() => setModal(null)}>
          <div className="mh" />
          <div style={{ textAlign: "center", marginBottom: 15 }}>
            <img src={selectedCard.img} alt={selectedCard.name} className="card-detail-img" />
            <div className="mt" style={{ textAlign: "center" }}>{selectedCard.name}</div>
            <div className="ms" style={{ textAlign: "center", marginBottom: 0 }}>+{selectedCard.pts} балів/день · {selectedCard.rarity}</div>
          </div>
          <div style={{ background: "var(--s2)", borderRadius: "var(--rs)", padding: "12px 13px", marginBottom: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: "var(--t2)" }}>Статус</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: selectedCard.active ? "var(--green)" : "var(--t2)" }}>{selectedCard.active ? "⚡ Активна" : "Неактивна"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--t2)" }}>Дохід</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--o3)" }}>+{selectedCard.rate} балів/год</span>
            </div>
          </div>
          {selectedCard.active
            ? <button className="btn" style={{ background: "var(--s3)", color: "var(--t2)" }} onClick={() => toggleCard(selectedCard.id, false)}>⏸ Деактивувати</button>
            : activeCards.length < 3
              ? <button className="btn" onClick={() => toggleCard(selectedCard.id, true)}>⚡ Активувати</button>
              : <div style={{ textAlign: "center", color: "var(--t3)", fontSize: 12, padding: 8 }}>Максимум 3 активних картки</div>
          }
          <button className="btn2" onClick={() => setModal(null)}>Закрити</button>
        </Overlay>
      )}

      {/* Pack Preview Modal */}
      {previewPack && modal !== "packopen" && (
        <div className="ov open" onClick={e => { if (e.target === e.currentTarget) setPreviewPack(null); }}>
          <div className="modal">
            <div className="mh" />
            <div className="prev-header">
              <img src={PACK_IMAGES[previewPack]} alt={PK_NAME[previewPack]} className="prev-pack-img" />
              <div>
                <div className="mt" style={{ marginBottom: 4 }}>{PK_NAME[previewPack]}</div>
                <div className="ms" style={{ marginBottom: 0 }}>
                  {payMode === "ton" ? `▼ ${PK_PRICE[previewPack]} TON` : `⭐ ${STARS_PRICE[previewPack]} зірок`}
                </div>
              </div>
            </div>

            <div className="prev-section">Шанси відкриття</div>

            {(["common", "rare", "legendary"] as const).map(rar => {
              const rate = PACK_RATES[previewPack][rar];
              const cards = ALL_CARDS.filter(c => c.rarity === rar);
              return (
                <div key={rar} className="prev-rar-row">
                  <div className="prev-rar-head">
                    <span className={`rar prev-rar-badge rar-${rar}`}>
                      {rar === "common" ? "COMMON" : rar === "rare" ? "✦ RARE" : "⭐ LEGENDARY"}
                    </span>
                    <span className="prev-rar-pct">{rate}%</span>
                  </div>
                  <div className="prev-rate-bar">
                    <div className={`prev-rate-fill rar-fill-${rar}`} style={{ width: `${rate}%` }} />
                  </div>
                  <div className="prev-cards-row">
                    {cards.map(c => (
                      <div key={c.tplId} className={`prev-card-thumb ${rar === "legendary" ? "mystery" : ""}`}>
                        {rar === "legendary"
                          ? <div className="prev-mystery">?</div>
                          : <img src={c.img} alt={c.name} />
                        }
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <button className="btn" style={{ marginTop: 18 }} onClick={() => payMode === "ton" ? buyPack(previewPack) : buyWithStars(previewPack)}>
              {payMode === "ton"
                ? `🎴 Відкрити за ▼ ${PK_PRICE[previewPack]} TON`
                : `🎴 Відкрити за ⭐ ${STARS_PRICE[previewPack]}`}
            </button>
            <button className="btn2" onClick={() => setPreviewPack(null)}>Скасувати</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="ov open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">{children}</div>
    </div>
  );
}
