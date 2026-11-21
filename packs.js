(() => {
const PackSize = 5;
const SummaryFirst = 30;
const MaxPacks = 100000;
const PackPresets = [1, 10, 100];
const DefaultCustomPacks = 25;
const FanMax = 10;
const TearSpan = 0.65;
const PackStorageKey = 'DemonGachaPackTest2';
const LevelsUrl = 'levels.json';
let LevelsLoading = true;
const TierBounds = {
    Apex: [1, 1],
    Mythic: [2, 10],
    Legendary: [11, 35],
    Epic: [36, 100],
    Rare: [101, 260],
    Uncommon: [261, 640],
    Common: [641, 9999]
};

const TierColors = {
    Common: '#9ca3af',
    Uncommon: '#22c55e',
    Rare: '#3b82f6',
    Epic: '#a855f7',
    Legendary: '#f59e0b',
    Mythic: '#f43f5e',
    Apex: '#fde68a',
    Limited: '#2dd4bf'
};

const Rainbow = ['#f43f5e', '#f59e0b', '#22c55e', '#22d3ee', '#a855f7', '#ffffff'];

const DefaultWeights = {
    Common: 75.841,
    Uncommon: 17.864,
    Rare: 4.706,
    Epic: 1.2167,
    Legendary: 0.2986,
    Mythic: 0.0692,
    Apex: 0.00428
};

const DefaultPackState = {
    Weights: { ...DefaultWeights },
    HoloChance: 5,
    Tear: true,
    Sound: true,
    Volume: 0.6,
    CustomWeight: DefaultWeights.Common,
    Pool: 'Levels',
    Owned: {},
    Opened: 0,
    Pulled: 0
};

const LoadPackState = () => {
    try {
        const Saved = JSON.parse(localStorage.getItem(PackStorageKey) || '{}');
        return {
            ...DefaultPackState,
            ...Saved,
            Weights: { ...DefaultWeights, ...(Saved.Weights || {}) },
            Owned: Saved.Owned || {}
        };
    } catch {
        return { ...DefaultPackState, Weights: { ...DefaultWeights }, Owned: {} };
    }
};

const PackState = LoadPackState();
let PackOpening = false;

const SavePackState = () => {
    try {
        localStorage.setItem(PackStorageKey, JSON.stringify(PackState));
    } catch {}
};

const Toast = (Message, IsError = false) => {
    const El = document.createElement('div');
    El.className = 'toast' + (IsError ? ' err' : '');
    El.setAttribute('role', IsError ? 'alert' : 'status');
    El.textContent = Message;
    Query('#Toasts').append(El);
    setTimeout(() => El.remove(), 5000);
};

const Modal = (Content) => {
    const Previous = document.activeElement;
    const Bg = document.createElement('div');
    Bg.className = 'modal-bg';
    Bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><button class="btn sm close" aria-label="Close">✕</button><div class="modal-body"></div></div>';
    Query('.modal-body', Bg).innerHTML = Content;
    const Lock = () => document.documentElement.classList.toggle('modal-open', !!Query('.modal-bg') || PackOpening);
    const OnKey = (Ev) => {
        if (Ev.key === 'Escape') Close();
    };
    const Close = () => {
        if (!Bg.isConnected) return;
        Bg.remove();
        Lock();
        document.removeEventListener('keydown', OnKey);
        Previous?.focus?.();
    };
    let DownOnBg = false;
    Bg.addEventListener('pointerdown', (Ev) => {
        DownOnBg = Ev.target === Bg;
    });
    Bg.addEventListener('click', (Ev) => {
        if ((Ev.target === Bg && DownOnBg) || Ev.target.closest('.close')) Close();
    });
    document.addEventListener('keydown', OnKey);
    document.body.append(Bg);
    Lock();
    Query('.close', Bg).focus();
    return { El: Query('.modal-body', Bg), Close };
};

const Confirm = (Message, Label) =>
    new Promise((Resolve) => {
        let Yes = false;
        const M = Modal(`<h2>Are you sure?</h2><p>${Escape(Message)}</p><div class="row" style="margin-top:16px"><button class="btn danger solid" id="ConfirmYes">${Escape(Label)}</button><button class="btn" id="ConfirmNo">Cancel</button></div>`);
        const Bg = M.El.closest('.modal-bg');
        const Watch = new MutationObserver(() => {
            if (!Bg.isConnected) {
                Watch.disconnect();
                Resolve(Yes);
            }
        });
        Watch.observe(document.body, { childList: true });
        Query('#ConfirmNo', M.El).onclick = M.Close;
        Query('#ConfirmYes', M.El).onclick = () => {
            Yes = true;
            M.Close();
        };
        Query('#ConfirmNo', M.El).focus();
    });
const Wait = (Ms) => new Promise((Resolve) => setTimeout(Resolve, ReduceMotion() ? Math.min(Ms, 80) : Ms));
const OneIn = (P) => (P ? `1 in ${Math.round(1 / P).toLocaleString()}` : '-');
const TierText = (Tier) => `<span class="tier-text ${TierClass(Tier)}">${Escape(Tier.toUpperCase())}</span>`;
const WeightTotal = () => Object.values(PackState.Weights).reduce((A, W) => A + Math.max(0, Number(W) || 0), 0);
const CustomWeightValue = () => Math.max(0, Number(PackState.CustomWeight) || 0);
const PoolTotal = () => WeightTotal() + (PackState.Pool === 'Mixed' ? CustomWeightValue() : 0);
const TierShare = (Tier) => {
    const Total = PoolTotal();
    return Total ? Math.max(0, Number(PackState.Weights[Tier]) || 0) / Total : 0;
};
const CustomShare = () => {
    const Total = PoolTotal();
    return Total ? CustomWeightValue() / Total : 0;
};

const RollTier = () => {
    const Total = WeightTotal();
    if (!Total) return 'Common';
    let Roll = Math.random() * Total;
    for (const Tier of Tiers.slice(0, 7)) {
        Roll -= Math.max(0, Number(PackState.Weights[Tier]) || 0);
        if (Roll <= 0) return Tier;
    }
    return 'Common';
};

let Levels = [];

const LoadLevels = async () => {
    const Res = await fetch(`${LevelsUrl}?v=${Date.now()}`, { cache: 'no-store' });
    if (!Res.ok) throw new Error(`HTTP ${Res.status} loading ${LevelsUrl}`);
    const Raw = await Res.json();
    const Source = Array.isArray(Raw) ? Raw : Raw.levels;
    if (!Array.isArray(Source)) throw new Error(`${LevelsUrl} has no "levels" array`);
    const List = Source.filter((L) => L && !L.legacy && L.name && Number.isFinite(Number(L.position)))
        .sort((A, B) => A.position - B.position)
        .map((L) => ({
            Id: L.id ?? L.position,
            Position: Number(L.position),
            Name: L.name,
            GdId: L.gdId ?? null,
            Verifier: L.verifier || '',
            Publisher: L.publisher || '',
            Thumb: L.thumb || ''
        }));
    if (!List.length) throw new Error('Empty level list');
    return List;
};

const BoundsFor = (Tier) => {
    const [Lo, High] = TierBounds[Tier];
    const Max = Levels.length || High;
    return [Math.min(Lo, Max), Math.min(High, Max)];
};

const LevelFor = (Index) => {
    const L = Levels[Index];
    return {
        Id: L.Id,
        Rank: L.Position,
        Order: L.Position,
        Name: L.Name,
        ShowHash: true,
        BadgeText: '',
        Line1: L.Verifier ? `Verified by ${L.Verifier}` : 'Verifier unknown',
        Line2: L.Publisher ? `Published by ${L.Publisher}` : '',
        ThumbUrl: L.Thumb || '',
        ThumbData: '',
        Favorite: false,
        Copies: 0,
        UseColor: false,
        NewMode: 'None'
    };
};

const RollLevelCard = () => {
    const Tier = RollTier();
    const [Low, High] = BoundsFor(Tier);
    const Index = Low - 1 + Math.floor(Math.random() * (High - Low + 1));
    return {
        ...LevelFor(Index),
        Tier,
        Holo: Math.random() * 100 < PackState.HoloChance,
        P: TierShare(Tier) / (High - Low + 1)
    };
};

const RollCustomCard = () => ({
    ...State,
    Id: 'Custom',
    Order: Number(State.Rank) || 999999,
    Copies: 0,
    NewMode: 'None',
    P: (PackState.Pool === 'Mixed' ? CustomShare() : TierShare(State.Tier)) || 0.01
});

const MarkOwned = (Cards) => {
    for (const Card of Cards) {
        const Entry = PackState.Owned[Card.Id] ?? { Normal: 0, Holo: 0 };
        if (Card.Holo) Card.IsNew = Entry.Holo ? false : Entry.Normal ? 'holo' : true;
        else Card.IsNew = Entry.Normal || Entry.Holo ? false : true;
        Entry[Card.Holo ? 'Holo' : 'Normal']++;
        PackState.Owned[Card.Id] = Entry;
    }
    PackState.Pulled += Cards.length;
};

const RollCard = () => {
    if (PackState.Pool === 'Custom') return RollCustomCard();
    if (PackState.Pool === 'Mixed' && Math.random() * PoolTotal() < CustomWeightValue()) return RollCustomCard();
    return RollLevelCard();
};

const RollPacks = async (Count) => {
    const Cards = Array.from({ length: Count * PackSize }, RollCard);
    MarkOwned(Cards);
    PackState.Opened += Count;
    SavePackState();
    return Cards;
};

const PackBag = () =>
    `<span class="bag" aria-hidden="true"><span class="bag-top"><span class="seam"></span><span class="tear-mark">tear here ›</span></span><span class="bag-body"><span class="wrinkles"></span><span class="pack-face"><span class="pack-rays"></span><img class="demon-icon" src="extreme-demon.png" alt="" draggable="false"><span class="pack-title">Extreme<b>Demon</b></span><span class="pack-sub">${PackSize} cards</span></span><span class="glints"><span class="glint" style="left:14%;top:22%;animation-delay:0s"></span><span class="glint" style="left:78%;top:30%;animation-delay:1.1s"></span><span class="glint" style="left:30%;top:64%;animation-delay:2.0s"></span><span class="glint" style="left:70%;top:72%;animation-delay:0.6s"></span><span class="glint" style="left:46%;top:14%;animation-delay:2.6s"></span><span class="glint" style="left:86%;top:56%;animation-delay:1.7s"></span><span class="glint" style="left:20%;top:86%;animation-delay:0.9s"></span></span><span class="seam bottom"></span></span></span>`;

const StackLayers = (Count = 0) =>
    Array.from({ length: FanMax - 1 }, (_, I) => I + 1).map((I) => `<span class="layer" style="--i:${I}" aria-hidden="true" ${I > Count ? 'hidden' : ''}>${PackBag()}</span>`).join('');

const FanStyle = (Count) => `--fan:${Count * 1.75}deg;--shift:${Count * 3}px`;

const FanStack = (Pack, Count) => {
    Pack.style.setProperty('--fan', `${Count * 1.75}deg`);
    Pack.style.setProperty('--shift', `${Count * 3}px`);
    QueryAll('.layer', Pack).forEach((Layer, I) => {
        Layer.hidden = I >= Count;
    });
};

const Particles = (Canvas) => {
    const G = Canvas.getContext('2d');
    let W;
    let H;
    let Parts = [];
    let Running = true;
    const Resize = () => {
        W = Canvas.width = innerWidth;
        H = Canvas.height = innerHeight;
    };
    Resize();
    addEventListener('resize', Resize);
    const Ambient = () => ({
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.3 - Math.random() * 0.8,
        life: 400,
        size: 1 + Math.random() * 2.5,
        color: ['#f87171', '#fbbf24', '#fca5a5'][Math.floor(Math.random() * 3)],
        g: 0
    });
    for (let I = 0; I < 60; I++) Parts.push({ ...Ambient(), y: Math.random() * H });
    const Loop = () => {
        if (!Running) return;
        G.clearRect(0, 0, W, H);
        if (Parts.length < 400 && Math.random() < 0.4) Parts.push(Ambient());
        Parts = Parts.filter((P) => P.life-- > 0 && P.y > -20 && P.y < H + 40);
        for (const P of Parts) {
            P.x += P.vx;
            P.y += P.vy;
            P.vy += P.g;
            G.globalAlpha = Math.min(1, P.life / 60);
            G.fillStyle = P.color;
            if (P.rect) {
                G.save();
                G.translate(P.x, P.y);
                G.rotate(P.life / 10);
                G.fillRect(-P.size, -P.size / 2, P.size * 2, P.size);
                G.restore();
            } else {
                G.beginPath();
                G.arc(P.x, P.y, P.size, 0, 7);
                G.fill();
            }
        }
        requestAnimationFrame(Loop);
    };
    if (!ReduceMotion()) Loop();
    return {
        Burst(Colors, Count = 80, Confetti = false) {
            if (ReduceMotion() || Parts.length > 1500) return;
            for (let I = 0; I < Count; I++) {
                const A = Math.random() * Math.PI * 2;
                const S = 2 + Math.random() * (Confetti ? 9 : 6);
                Parts.push({
                    x: W / 2,
                    y: H / 2,
                    vx: Math.cos(A) * S,
                    vy: Math.sin(A) * S - (Confetti ? 4 : 0),
                    g: Confetti ? 0.15 : 0.02,
                    life: 90 + Math.random() * 80,
                    size: Confetti ? 5 : 2 + Math.random() * 2,
                    rect: Confetti,
                    color: Colors[I % Colors.length]
                });
            }
        },
        Stop() {
            Running = false;
            G.clearRect(0, 0, W, H);
            removeEventListener('resize', Resize);
        }
    };
};

const CardsFlyOut = async (PackStage, Overlay, Row, All) => {
    const Inside = QueryAll('.pack > .bag .pack-cards .card-back', PackStage).reverse();
    const R = PackStage.getBoundingClientRect();
    Object.assign(PackStage.style, {
        position: 'fixed',
        left: `${R.left}px`,
        top: `${R.top}px`,
        margin: '0'
    });
    const Slots = All ? [] : QueryAll('.slot', Row);
    if (!All) {
        Slots.forEach((S) => (S.style.opacity = '0'));
        Overlay.append(Row);
    }
    const N = Inside.length;
    const Ms = ReduceMotion() ? 1 : 720;
    setTimeout(() => PackStage.classList.add('emptied'), ReduceMotion() ? 0 : 260);
    await Promise.all(
        Inside.map((El, I) => {
            const From = El.getBoundingClientRect();
            const To = All
                ? {
                      left: innerWidth / 2 - From.width / 2 + (I - (N - 1) / 2) * From.width * 0.9,
                      top: -From.height * 1.4,
                      width: From.width,
                      height: From.height
                  }
                : Query('.card-back', Slots[I]).getBoundingClientRect();
            const Fly = document.createElement('div');
            Fly.className = 'card-back flying';
            Object.assign(Fly.style, {
                left: `${To.left}px`,
                top: `${To.top}px`,
                width: `${To.width}px`,
                height: `${To.height}px`
            });
            const Dx = From.left - To.left;
            const Dy = From.top - To.top;
            const K = From.width / To.width;
            const Apex = Math.min(From.top, To.top) - To.top - 120 - I * 10;
            const Tilt = (I - (N - 1) / 2) * 9;
            const A = Fly.animate(
                [
                    { transform: `translate(${Dx}px, ${Dy}px) scale(${K})` },
                    { transform: `translate(${Dx * 0.55}px, ${Apex}px) scale(${((K + 1) / 2) * 1.06}) rotate(${Tilt}deg)`, offset: 0.45 },
                    All ? { transform: `translate(0, 0) rotate(${Tilt * 2}deg)`, opacity: 0 } : { transform: 'none' }
                ],
                {
                    duration: Ms,
                    delay: ReduceMotion() ? 0 : I * 110,
                    easing: 'cubic-bezier(.33, .8, .3, 1)',
                    fill: 'both'
                }
            );
            let Landed = false;
            setTimeout(
                () => {
                    El.style.visibility = 'hidden';
                    if (!Landed) {
                        Overlay.append(Fly);
                        sfx.flip();
                    }
                },
                ReduceMotion() ? 0 : I * 110
            );
            return A.finished
                .catch(() => {})
                .then(() => {
                    Landed = true;
                    if (!All) {
                        Slots[I].style.transition = 'none';
                        Slots[I].style.opacity = '';
                    }
                    Fly.remove();
                });
        })
    );
};

const TearOpen = (PackStage, Overlay, IsSkipped) => {
    const Pack = Query('.pack', PackStage);
    const Bag = Query('.pack > .bag', PackStage);
    const Top = Query('.bag-top', Bag);
    const Body = Query('.bag-body', Bag);
    const Rip = Query('.rip', Bag);
    const Hint = Query('.tear-hint', Overlay);
    let Target = 0;
    let Shown = 0;
    let Dir = 0;
    let Entry = 0;
    let Far = 0;
    let Prev = null;
    let Grain = 0;
    let Speed = 0;
    let Torn = false;
    let Raf = 0;
    let Last = 0;
    let Done;
    let Reached = null;
    let Grip = 0;
    let Pulling = false;
    const Finished = new Promise((Resolve) => (Done = Resolve));

    const Band = () => {
        const R = Pack.getBoundingClientRect();
        return {
            l: R.left,
            r: R.right,
            t: R.top - R.height * 0.15,
            b: R.top + R.height * 0.35,
            w: R.width
        };
    };

    const Crossing = (A, B, Box) => {
        let T0 = 0;
        let T1 = 1;
        const Dy = B.y - A.y;
        if (!Dy) {
            if (A.y < Box.t || A.y > Box.b) return null;
        } else {
            let Ta = (Box.t - A.y) / Dy;
            let Tb = (Box.b - A.y) / Dy;
            if (Ta > Tb) [Ta, Tb] = [Tb, Ta];
            T0 = Math.max(0, Ta);
            T1 = Math.min(1, Tb);
            if (T0 > T1) return null;
        }
        const Ax = A.x + (B.x - A.x) * T0;
        const Bx = A.x + (B.x - A.x) * T1;
        const Clamp = (X) => Math.min(Box.r, Math.max(Box.l, X));
        if (Math.max(Ax, Bx) < Box.l || Math.min(Ax, Bx) > Box.r) return null;
        return [Clamp(Ax), Clamp(Bx)];
    };

    const Pull = (A, B) => {
        const Box = Band();
        const Clamp = (X) => Math.min(Box.r, Math.max(Box.l, X));
        const C = Dir ? [Clamp(A.x), Clamp(B.x)] : Crossing(A, B, Box);
        if (!C) return;
        if (Reached == null) Reached = C[0];
        if (!Dir) {
            if (Math.abs(C[1] - Reached) < 6) return;
            Dir = Math.sign(C[1] - Reached);
            Entry = Reached;
            PackStage.classList.add('pulling');
        }
        const Before = Target;
        Far = Math.max(Far, Dir * (C[1] - Entry));
        Target = Math.min(1, Far / (Box.w * TearSpan));
        Grain += (Target - Before) * Box.w * TearSpan;
        const Loud = Math.min(1, Speed / 1.5);
        while (Grain >= 7) {
            Grain -= 7;
            sfx.rip(Loud);
            navigator.vibrate?.(3);
        }
        Go();
    };

    const Frame = (Now) => {
        Raf = 0;
        const Dt = Math.min(50, Now - (Last || Now));
        Last = Now;
        Shown += (Target - Shown) * (1 - Math.exp(-Dt / 15));
        if (Math.abs(Target - Shown) < 0.002) Shown = Target;
        const D = Dir || 1;
        Rip.style.clipPath = D > 0 ? `inset(0 ${(1 - Shown) * 100}% 0 0)` : `inset(0 0 0 ${(1 - Shown) * 100}%)`;
        Top.style.transformOrigin = D < 0 ? '0% 100%' : '100% 100%';
        Top.style.transform = `translateY(${-Shown * 3 - Grip * 2}px) rotate(${D * Shown * Shown * 7}deg)`;
        Body.style.setProperty('--tp', Shown);
        if (Target >= 1 && Shown > 0.985) return Finish();
        if (Shown !== Target) Go();
        else Last = 0;
    };

    const Go = () => {
        if (!Raf && !Torn) Raf = requestAnimationFrame(Frame);

    };

    const Finish = () => {
        if (Torn) return;
        Torn = true;
        Cleanup();
        Hint.remove();
        Rip.style.clipPath = 'none';
        const D = Dir || 1;
        const From = getComputedStyle(Top).transform;
        sfx.tear();
        navigator.vibrate?.([12, 30, 20]);
        Top.animate(
            [
                { transform: From },
                { transform: `translate(${D * 34}px, -26px) rotate(${D * 20}deg)`, offset: 0.3 },
                { transform: `translate(${D * 260}px, -210px) rotate(${D * 84}deg)`, opacity: 0 }
            ],
            { duration: ReduceMotion() ? 1 : 780, easing: 'cubic-bezier(.22, .7, .3, 1)', fill: 'forwards' }
        );
        Rip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
        if (!ReduceMotion())
            Pack.animate([{ scale: 1 }, { scale: 1.045, offset: 0.35 }, { scale: 0.985, offset: 0.7 }, { scale: 1 }], {
                duration: 420,
                easing: 'ease-out'
            });
        Done();
    };

    const Down = (Ev) => {
        if (Ev.target.closest('button')) return;
        Overlay.setPointerCapture?.(Ev.pointerId);
        Prev = { x: Ev.clientX, y: Ev.clientY, t: performance.now() };
        Speed = 0;
        Reached = null;
        unlockAudio();
        const Box = Band();
        if (Ev.clientX >= Box.l && Ev.clientX <= Box.r && Ev.clientY >= Box.t && Ev.clientY <= Box.b) {
            Reached = Ev.clientX;
            Grip = 1;
            sfx.rip(0.1);
            Go();
        }
    };

    const Move = (Ev) => {
        if (!Prev) return;
        const Now = performance.now();
        const Cur = { x: Ev.clientX, y: Ev.clientY, t: Now };
        Speed = Math.hypot(Cur.x - Prev.x, Cur.y - Prev.y) / Math.max(1, Now - Prev.t);
        Pull(Prev, Cur);
        Prev = Cur;
    };

    const Up = () => {
        if (!Prev) return;
        Prev = null;
        Grip = 0;
        Go();
        if (Target < 1 && (Target >= 0.5 || (Target > 0.15 && Speed > 0.5))) Auto();
    };

    const Auto = async () => {
        if (Pulling || Torn) return;
        Pulling = true;
        if (!Dir) {
            Dir = 1;
            PackStage.classList.add('pulling');
        }
        const From = Target;
        const T0 = performance.now();
        const Ms = 120 + 580 * (1 - Target);
        while (!Torn && !IsSkipped()) {
            const K = Math.min(1, (performance.now() - T0) / Ms);
            const Next = From + (1 - From) * (1 - (1 - K) ** 2);
            Grain += (Next - Target) * 200;
            Target = Next;
            while (Grain >= 7) {
                Grain -= 7;
                sfx.rip(0.6);
            }
            Go();
            if (K >= 1) break;
            await new Promise(requestAnimationFrame);
        }
    };

    Overlay.addEventListener('pointerdown', Down);
    Overlay.addEventListener('pointermove', Move);
    Overlay.addEventListener('pointerup', Up);
    Overlay.addEventListener('pointercancel', Up);
    Hint.querySelector('button').onclick = Auto;
    const SkipWatch = setInterval(() => {
        if (IsSkipped() && !Torn) {
            Torn = true;
            Cleanup();
            Hint.remove();
            Done();
        }
    }, 100);

    function Cleanup() {
        clearInterval(SkipWatch);
        cancelAnimationFrame(Raf);
        Overlay.classList.remove('tearable');
        PackStage.classList.add('pulling');
        for (const [Type, Handler] of [
            ['pointerdown', Down],
            ['pointermove', Move],
            ['pointerup', Up],
            ['pointercancel', Up]
        ])
            Overlay.removeEventListener(Type, Handler);
    }

    return Finished;

};

const IsGoodPull = (Card) => TierIndex(Card.Tier) >= 3;

const Suspense = async (Row, Slot, IsSkipped) => {
    Row.classList.add('focus');
    Slot.classList.add('tease');
    for (const Level of [1, 2, 3]) {
        Slot.dataset.shake = Level;
        for (let K = 0; K < 3 && !IsSkipped(); K++) {
            sfx.shake(Level);
            await Wait(330 - Level * 60);
        }
    }
    delete Slot.dataset.shake;
    if (!IsSkipped()) await Wait(500);
    Row.classList.remove('focus');
    Slot.classList.remove('tease');
};

const SpecialReveal = async (Overlay, Card, Fx, IsSkipped) => {
    const Sp = document.createElement('div');
    const Lite = Card.Tier === 'Legendary';
    Sp.className = `special ${TierClass(Card.Tier)} ${Lite ? 'lite' : ''}`;
    const Heading = Card.Tier === 'Apex' ? (Card.Order === 1 ? '#1 APEX PULL' : 'APEX PULL') : `${Card.Tier.toUpperCase()} PULL`;
    Sp.innerHTML = `<div class="rays" aria-hidden="true"></div><h2>${Heading}</h2><div class="special-card">${BuildCard(Card)}</div><p style="position:relative">${Card.Holo ? 'HOLOGRAPHIC · ' : ''}${OneIn(Card.P)} per card</p><button class="btn primary" style="position:relative">Continue</button>`;
    Overlay.append(Sp);
    if (Card.Tier === 'Apex') sfx.apex();
    else sfx.reveal(TierIndex(Card.Tier));
    if (Card.Holo) setTimeout(() => sfx.holo(), 600);
    Fx.Burst(Lite ? [TierColors.Legendary, '#fde68a', '#fff'] : Rainbow, Lite ? 90 : 220, true);
    const Iv = setInterval(() => Fx.Burst(Card.Tier === 'Apex' ? Rainbow : [TierColors[Card.Tier], '#fff'], Lite ? 25 : 60, true), Lite ? 1400 : 900);
    Query('button', Sp).focus();
    await new Promise((Resolve) => {
        Query('button', Sp).onclick = Resolve;
        const T = setInterval(() => {
            if (IsSkipped()) {
                clearInterval(T);
                Resolve();
            }
        }, 100);
    });
    clearInterval(Iv);
    Sp.remove();
};

const NewTagFor = (Card) => (Card.IsNew ? `<span class="own-tag new pack-tag">${Card.IsNew === 'holo' ? '✦ NEW HOLO' : '✦ NEW'}</span>` : '');

const ShowCardModal = (Card) => {
    const M = Modal(`<div class="detail">${BuildViewer(Card)}

      <div>

        <h2 style="font-size:1.5rem;text-transform:none">${Escape(RankText(Card))} ${Escape(CardName(Card))}</h2>

        <p>${TierText(Card.Tier)}${Card.Holo ? ' <span class="holo-badge">✦ HOLO</span>' : ''}</p>

        <dl class="kv">

          <dt>Verifier</dt><dd>${Escape(Card.Line1 || '-')}</dd>

          <dt>Published by</dt><dd>${Escape(Card.Line2 || '-')}</dd>

          <dt>Drop chance</dt><dd>${Escape(OneIn(Card.P))} per card</dd>

        </dl>

      </div></div>`);
    WireViewer(Query('.inspect', M.El));
};

const OpenPack = async (RequestedCount) => {
    if (PackOpening) return;
    if (LevelsLoading) return Toast('The level list is still loading.', true);
    if (PackState.Pool !== 'Custom' && !Levels.length) return Toast('No levels loaded. Reload the page to retry.', true);
    const Count = Math.max(1, Math.min(MaxPacks, Math.floor(Number(RequestedCount)) || 1));
    PackOpening = true;
    UpdatePackButtons();
    unlockAudio();
    const All = Count > 1;
    const Overlay = document.createElement('div');
    Overlay.className = 'opening';
    Overlay.setAttribute('role', 'dialog');
    Overlay.setAttribute('aria-modal', 'true');
    Overlay.setAttribute('aria-label', All ? `Opening ${Count} packs` : 'Opening pack');
    Overlay.innerHTML = '<canvas aria-hidden="true"></canvas><div class="flash"></div><button class="btn skip">Skip ⏭</button><p class="sr-only" aria-live="assertive" id="PackAnnounce"></p>';
    const PackStage = document.createElement('div');
    PackStage.className = 'stage-pack';
    const Layers = Math.min(Count, FanMax) - 1;
    PackStage.innerHTML = `<div class="pack" aria-hidden="true" style="${FanStyle(Layers)}">${StackLayers(Layers)}${PackBag()}</div>`;
    const ByHand = PackState.Tear;
    if (ByHand) Query('.pack > .bag', PackStage).insertAdjacentHTML('beforeend', '<span class="rip"></span><span class="tear-guide"><span class="tear-line"></span><span class="tear-finger"></span></span>');
    Query('.pack > .bag .bag-body', PackStage).insertAdjacentHTML(
        'beforebegin',
        `<span class="pack-cards">${[0, 1, 2, 3, 4].map((I) => `<span class="card-back" style="translate:${(I - 2) * 1.5}px ${-I * 1.2}px;rotate:${(I - 2) * 0.8}deg"></span>`).join('')}</span>`
    );
    Overlay.append(PackStage);
    document.body.append(Overlay);
    document.documentElement.classList.add('modal-open', 'pack-open');
    const Fx = Particles(Query('canvas', Overlay));
    let Skipped = false;
    const SkipButton = Query('.skip', Overlay);
    if (ByHand) {
        Overlay.insertAdjacentHTML('beforeend', '<div class="tear-hint"><span aria-hidden="true">Swipe across the top to tear it open</span><button class="btn sm">Tear open</button></div>');
        Query('.tear-hint button', Overlay).focus();
    } else SkipButton.focus();
    const Announce = (Text) => (Query('#PackAnnounce', Overlay).textContent = Text);
    const Finish = () => {
        Fx.Stop();
        Overlay.classList.add('closing');
        setTimeout(() => Overlay.remove(), ReduceMotion() ? 0 : 250);
        PackOpening = false;
        document.documentElement.classList.remove('pack-open');
        document.documentElement.classList.toggle('modal-open', !!Query('.modal-bg'));
        UpdatePackButtons();
        UpdatePackStats();
    };
    SkipButton.onclick = () => {
        Skipped = true;
    };

    try {
        const RolledPromise = RollPacks(Count);
        RolledPromise.catch(() => {});
        UpdatePackStats();
        if (ByHand) {
            PackStage.classList.add('tearable', 'hand');
            Overlay.classList.add('tearable');
            await TearOpen(PackStage, Overlay, () => Skipped);
        } else
            for (const Level of [1, 2, 3]) {
                if (Skipped) break;
                Overlay.className = `opening shake${Level}`;
                for (let I = 0; I < 4 && !Skipped; I++) {
                    sfx.shake(Level);
                    await Wait(180 - Level * 30);
                }
            }
        const Rolled = await RolledPromise;
        const Cards = All
            ? Rolled.sort((A, B) => TierIndex(B.Tier) - TierIndex(A.Tier) || B.Holo - A.Holo || A.Order - B.Order)
            : Rolled.map((C) => [Math.random(), C])
                  .sort((A, B) => A[0] - B[0])
                  .map(([, C]) => C)
                  .sort((A, B) => TierIndex(A.Tier) - TierIndex(B.Tier));
        const Row = document.createElement('div');
        Row.className = 'reveal-row';
        if (!All)
            Row.innerHTML = Cards.map(
                (C, I) =>
                    `<div class="slot ${TierClass(C.Tier)}" data-i="${I}"><div class="flipper"><div class="face back"><div class="card-back" aria-hidden="true">?</div></div><div class="face front">${BuildCard(C)}</div></div><div class="reveal-label"></div></div>`
            ).join('');
        if (!Skipped) {
            Overlay.className = 'opening';
            PackStage.classList.add('torn');
            Fx.Burst(['#fca5a5', '#f87171', '#fde68a', '#fff'], ByHand ? 60 : 90);
            if (!ByHand) {
                sfx.tear();
                Query('.flash', Overlay).classList.add('go');
            }
            if (!ByHand && !ReduceMotion())
                for (let I = 0; I < 14; I++) {
                    const Frag = document.createElement('div');
                    Frag.className = 'frag';
                    const A = Math.random() * Math.PI * 2;
                    const D = 200 + Math.random() * 400;
                    Frag.style.cssText = `left:50%;top:50%;--dx:${Math.cos(A) * D}px;--dy:${Math.sin(A) * D}px;--rot:${Math.random() * 720}deg;clip-path:polygon(${Math.random() * 50}% 0,100% ${Math.random() * 100}%,0 100%)`;
                    Overlay.append(Frag);
                    setTimeout(() => Frag.remove(), 1100);
                }
            await Wait(420);
            PackStage.classList.add('rise');
            await Wait(380);
            if (!Skipped) await CardsFlyOut(PackStage, Overlay, Row, All);
        }
        PackStage.remove();
        if (All) {
            for (const C of Cards) if (!Skipped && TierIndex(C.Tier) >= 4) await SpecialReveal(Overlay, C, Fx, () => Skipped);
            if (!Skipped) {
                sfx.reveal(TierIndex(Cards[0].Tier));
                if (Cards.some((C) => C.Holo)) setTimeout(() => sfx.holo(), 200);
            }
        }
        if (!All && !Row.isConnected) Overlay.append(Row);
        const FakeAt = !All && !IsGoodPull(Cards.at(-1)) && Math.random() < 0.25 ? Cards.length - 1 : -1;
        for (let I = 0; I < Cards.length && !Skipped && !All; I++) {
            const C = Cards[I];
            const Ti = TierIndex(C.Tier);
            const Slot = Query(`.slot[data-i="${I}"]`, Row);
            await Wait(380);
            if (Skipped) break;
            if (IsGoodPull(C) || I === FakeAt) {
                await Suspense(Row, Slot, () => Skipped);
                if (Skipped) break;
            }
            if (Ti >= 4) {
                await SpecialReveal(Overlay, C, Fx, () => Skipped);
                if (Skipped) break;
            }
            sfx.flip();
            Query('.flipper', Slot).classList.add('flipped');
            Slot.classList.add('revealed');
            if (Ti >= 4) Slot.classList.add('big-reveal');
            sfx.reveal(Ti);
            if (C.Holo) {
                setTimeout(() => sfx.holo(), 150);
                Fx.Burst(Rainbow, 90, true);
            } else if (Ti >= 3) Fx.Burst([TierColors[C.Tier], '#fff'], 40 + Ti * 20);
            Query('.reveal-label', Slot).innerHTML = `${TierText(C.Tier)}${C.Holo ? ' <span class="holo-badge">HOLO</span>' : ''}${NewTagFor(C)}`;
            Announce(`Card ${I + 1}: ${RankText(C)} ${CardName(C)}, ${C.Tier}${C.Holo ? ', holographic' : ''}${C.IsNew ? ', new' : ''}`);
            await Wait(Ti >= 4 ? 900 : 450);
        }
        if (!Skipped && !All) await Wait(700);
        Row.remove();
        SkipButton.remove();
        Query('.special', Overlay)?.remove();
        QueryAll('.card-back.flying', Overlay).forEach((F) => F.remove());
        const Best = Cards.reduce((A, C) => ((TierIndex(C.Tier) - TierIndex(A.Tier) || A.Order - C.Order) > 0 ? C : A));
        const Sum = document.createElement('div');
        Sum.className = 'summary';
        const Counts = Tiers.slice(0, 7)
            .map((T) => [T, Cards.filter((C) => C.Tier === T).length])
            .filter(([, K]) => K)
            .reverse();
        const Holos = Cards.filter((C) => C.Holo).length;
        const Fresh = Cards.filter((C) => C.IsNew).length;
        const SummaryCards = (From, To) =>
            Cards.slice(From, To)
                .map((C, K) => `<div class="card-wrap ${C.IsNew ? 'is-new' : ''}">${BuildCard(C).replace('<div class="card ', `<div data-i="${From + K}" class="card `)}${NewTagFor(C)}</div>`)
                .join('');
        const Shown = All ? SummaryFirst : Cards.length;
        Sum.innerHTML = `<h2>${All ? `Opened ${Count} packs!` : 'Pack opened!'}</h2><p class="muted">Best pull: ${TierText(Best.Tier)} ${Escape(RankText(Best))} ${Escape(CardName(Best))} · ✓ All ${Cards.length} cards were added to your test collection.</p>

      <p class="pack-new ${Fresh ? '' : 'none'}">${Fresh ? `✦ ${Fresh} new for your collection` : 'No new cards this time, only duplicates.'}</p>

      ${All ? `<p class="row" style="justify-content:center;gap:14px">${Counts.map(([T, K]) => `<span>${TierText(T)} ×${K}</span>`).join('')}${Holos ? `<span class="holo-badge">✦ HOLO ×${Holos}</span>` : ''}</p>` : ''}

      <div class="card-grid summary-grid ${All ? 'many' : ''}">${SummaryCards(0, Shown)}</div>

      ${Cards.length > Shown ? `<p style="text-align:center;margin:12px 0 0"><button class="btn sm" id="PackMoreCards">Show the other ${Cards.length - Shown} cards</button></p>` : ''}

      <div class="row" style="justify-content:center;margin-top:20px">

        <button class="btn primary" id="PackAgain">${Count === 1 ? 'Open another' : `Open ${Count} more`}</button>

        <button class="btn" id="PackDone">Continue</button></div>`;
        Overlay.append(Sum);
        if (All) Fx.Stop();
        QueryAll('.card', Sum).forEach((El, I) => (El.style.animationDelay = `${Math.min(I * 30, 1200)}ms`));
        Announce(`Pack summary: ${Fresh} new. ${Cards.map((C) => `${RankText(C)} ${CardName(C)} ${C.Tier}${C.Holo ? ' holo' : ''}${C.IsNew ? ' (new)' : ''}`).join('; ')}`);
        Query('#PackDone', Sum).focus({ preventScroll: true });
        Sum.scrollTop = 0;
        Query('.card-grid', Sum).addEventListener('click', (Ev) => {
            const El = Ev.target.closest('.card');
            if (El) ShowCardModal(Cards[El.dataset.i]);
        });
        Query('#PackMoreCards', Sum)?.addEventListener('click', (Ev) => {
            Query('.card-grid', Sum).insertAdjacentHTML('beforeend', SummaryCards(Shown, Cards.length));
            Ev.target.parentElement.remove();
        });
        await new Promise((Resolve) => {
            Query('#PackDone', Sum).onclick = () => Resolve();
            Query('#PackAgain', Sum).onclick = () => {
                Resolve();
                setTimeout(() => OpenPack(Count), 50);
            };
        });
    } catch (Err) {
        console.error(Err);
        Toast('Something went wrong while opening the pack.', true);
    }
    Finish();
};

Query('#PackPresetButtons').innerHTML = PackPresets.filter((N) => N >= 1 && N <= MaxPacks)
    .map((N, I) => `<button type="button" class="btn ${I === 0 ? 'primary ' : ''}open-btn" data-open="${N}">Open ${N}</button>`)
    .join('');

const PackButtons = QueryAll('[data-open]', PacksView);

const HeroPack = Query('#HeroPack');

const CustomInput = Query('#PackCustomInput');
CustomInput.min = 1;
CustomInput.max = MaxPacks;
CustomInput.value = Math.min(DefaultCustomPacks, MaxPacks);
Query('#PackLimit').textContent = `1 to ${MaxPacks} packs at a time.`;

const UpdatePackButtons = () => {
    QueryAll('[data-open], #PackCustomForm button, #HeroPack', PacksView).forEach((B) => (B.disabled = PackOpening || LevelsLoading));

};

const UpdatePackStats = () => {
    const Entries = Object.entries(PackState.Owned);
    const OwnedLevels = Entries.filter(([K]) => K !== 'Custom').length;
    const HoloLevels = Entries.filter(([K, V]) => K !== 'Custom' && V.Holo).length;
    Query('#PackStatOpened').innerHTML = `${PackState.Opened.toLocaleString()} <small>pack${PackState.Opened === 1 ? '' : 's'} opened</small>`;
    Query('#PackStatLine').textContent = PackState.Pulled
        ? `${PackState.Pulled.toLocaleString()} cards pulled · ${OwnedLevels.toLocaleString()} / ${Levels.length ? Levels.length.toLocaleString() : '?'} levels · ${HoloLevels.toLocaleString()} as holo`
        : 'No cards yet.';
};

const SetFan = (Count) => FanStack(HeroPack, Math.max(0, Math.min(Count, FanMax) - 1));

const ClampCustom = () => Math.max(1, Math.min(MaxPacks, Math.floor(Number(CustomInput.value)) || 1));

const UpdateRateLabels = () => {
    const Mixed = PackState.Pool === 'Mixed';
    Query('#CustomWeightField').hidden = !Mixed;
    if (Mixed) {
        const Share = CustomShare() * 100;
        Query('#CustomWeightShare').textContent = `${Share < 0.1 && Share > 0 ? Share.toPrecision(2) : Share.toFixed(2)}% of cards · your custom card`;
    }
    QueryAll('[data-rate]', PacksView).forEach((Input) => {
        const Share = TierShare(Input.dataset.rate) * 100;
        const [Low, High] = BoundsFor(Input.dataset.rate);
        Query(`[data-share="${Input.dataset.rate}"]`, PacksView).textContent = `${Share < 0.1 && Share > 0 ? Share.toPrecision(2) : Share.toFixed(2)}% of cards · ranks ${Low}-${High}`;
    });
};

const FillPackControls = () => {
    QueryAll('[data-pack]', PacksView).forEach((Control) => {
        const Value = PackState[Control.dataset.pack];
        if (Control.type === 'checkbox') Control.checked = !!Value;
        else Control.value = Value;
    });
    const Volume = Query('[data-pack="Volume"]', PacksView);
    Volume.style.setProperty('--val', `${PackState.Volume * 100}%`);
    Query('#PackVolumeOut').textContent = `${Math.round(PackState.Volume * 100)}%`;
    QueryAll('[data-rate]', PacksView).forEach((Input) => (Input.value = PackState.Weights[Input.dataset.rate]));
    UpdateRateLabels();
    configureAudio({ sound: PackState.Sound, volume: PackState.Volume });
};

Query('#RateGrid').innerHTML = Tiers.slice(0, 7)
    .slice()
    .reverse()
    .map(
        (Tier) =>
            `<label class="field RateField ${TierClass(Tier)}"><span class="tier-text ${TierClass(Tier)}">${Tier.toUpperCase()}</span><input type="number" data-rate="${Tier}" min="0" step="any" inputmode="decimal" aria-label="${Tier} weight"><small class="muted" data-share="${Tier}"></small></label>`
    )
    .join('');

HeroPack.innerHTML = `${StackLayers(0)}${PackBag()}`;

FanStack(HeroPack, FanMax - 1);

HeroPack.addEventListener('click', () => OpenPack(1));

PackButtons.forEach((Button) => {
    Button.addEventListener('click', () => OpenPack(Number(Button.dataset.open)));
    ['mouseenter', 'focus'].forEach((Type) => Button.addEventListener(Type, () => SetFan(Number(Button.dataset.open))));
});

Query('#PackCustomForm').addEventListener('submit', (Ev) => {
    Ev.preventDefault();
    CustomInput.value = ClampCustom();
    OpenPack(ClampCustom());
});

CustomInput.addEventListener('focus', () => SetFan(ClampCustom()));

CustomInput.addEventListener('input', () => SetFan(ClampCustom()));

PacksView.addEventListener('input', (Ev) => {
    const Control = Ev.target;
    if (Control.dataset.rate) {
        PackState.Weights[Control.dataset.rate] = Math.max(0, Number(Control.value) || 0);
        UpdateRateLabels();
        SavePackState();
        return;
    }
    const Key = Control.dataset.pack;
    if (!Key) return;
    if (Control.type === 'checkbox') PackState[Key] = Control.checked;
    else if (Control.type === 'range' || Control.type === 'number') PackState[Key] = Number(Control.value);
    else PackState[Key] = Control.value;
    if (Key === 'HoloChance') PackState.HoloChance = Math.max(0, Math.min(100, Number(Control.value) || 0));
    if (Key === 'CustomWeight') PackState.CustomWeight = Math.max(0, Number(Control.value) || 0);
    if (Key === 'Pool' || Key === 'CustomWeight') UpdateRateLabels();
    if (Key === 'Volume') {
        Control.style.setProperty('--val', `${PackState.Volume * 100}%`);
        Query('#PackVolumeOut').textContent = `${Math.round(PackState.Volume * 100)}%`;
    }
    if (Key === 'Sound' || Key === 'Volume') {
        configureAudio({ sound: PackState.Sound, volume: PackState.Volume });
        if (Key === 'Volume' || PackState.Sound) {
            unlockAudio();
            sfx.reveal(2);
        }
    }
    SavePackState();
});

Query('#PackRatesReset').addEventListener('click', () => {
    PackState.Weights = { ...DefaultWeights };
    PackState.CustomWeight = DefaultWeights.Common;
    PackState.HoloChance = DefaultPackState.HoloChance;
    SavePackState();
    FillPackControls();
});

Query('#PackResetCollection').addEventListener('click', async () => {
    if (!(await Confirm('Clear every card pulled in this browser and the packs opened counter?', 'Reset collection'))) return;
    PackState.Owned = {};
    PackState.Opened = 0;
    PackState.Pulled = 0;
    SavePackState();
    UpdatePackStats();
});

document.addEventListener(
    'click',
    (Ev) => {
        unlockAudio();
        if (Ev.target.closest('button, a.btn')) sfx.click();
    },
    true
);

document.addEventListener('pointermove', (Ev) => {
    const El = Ev.target.closest?.('.card, .pack');
    if (!El || Ev.pointerType !== 'mouse' || ReduceMotion() || El.closest('.inspect') || El.closest('#PreviewStage')) return;
    const Box = El.getBoundingClientRect();
    const X = (Ev.clientX - Box.left) / Box.width;
    const Y = (Ev.clientY - Box.top) / Box.height;
    El.style.setProperty('--mx', `${X * 100}%`);
    El.style.setProperty('--my', `${Y * 100}%`);
    El.style.setProperty('--hue', `${(X + Y - 1) * 150}deg`);
    El.style.setProperty('--rx', `${(X - 0.5) * 14}deg`);
    El.style.setProperty('--ry', `${(0.5 - Y) * 14}deg`);
});

document.addEventListener('pointerout', (Ev) => {
    const El = Ev.target.closest?.('.card, .pack');
    if (El && !El.contains(Ev.relatedTarget) && !El.closest('#PreviewStage')) {
        El.style.removeProperty('--rx');
        El.style.removeProperty('--ry');
    }
});

const ThumbFallback = (Ev) => {
    const Img = Ev.target;
    if (Img.tagName !== 'IMG' || !Img.closest('.card')) return;
    let IsYoutubeThumb = false;
    try {
        IsYoutubeThumb = new URL(Img.currentSrc || Img.src, location.href).hostname.toLowerCase() === 'i.ytimg.com';
    } catch {}

    if (!IsYoutubeThumb) return;
    if (Ev.type === 'load' && Img.naturalWidth !== 120) return;

    const Ph = document.createElement('div');
    Ph.className = 'ph';
    Ph.textContent = Img.dataset.ph || Img.closest('.card').querySelector('.card-name')?.textContent || '';
    Img.replaceWith(Ph);
};

document.addEventListener('error', ThumbFallback, true);

document.addEventListener('load', ThumbFallback, true);

FillPackControls();

UpdatePackStats();

UpdatePackButtons();

LoadLevels()
    .then((List) => {
        Levels = List;
    })
    .catch((Err) => {
        console.error(Err);
        Toast("Couldn't load levels.json. Make sure it sits next to index.html and you're running through a local server.", true);
    })
    .finally(() => {
        LevelsLoading = false;
        UpdateRateLabels();
        UpdatePackButtons();
        UpdatePackStats();
    });
})();