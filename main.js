const Tiers = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Apex', 'Limited'];
const StorageKey = 'DemonGachaCardMaker';
const EdgeCount = 7;
const MinZoom = 0.25;
const MaxZoom = 4;
const WindowAspect = 9 / 16;
const SnapPixels = 7;

const Defaults = {
    Name: 'Custom Card',
    Rank: '1',
    ShowHash: true,
    Tier: 'Epic',
    BadgeText: '',
    Line1: 'Verified by You',
    Line2: 'Published by You',
    ThumbUrl: '',
    ThumbData: '',
    ThumbZoom: 1,
    ThumbX: 0,
    ThumbY: 0,
    ThumbLock: 'Free',
    NewMode: 'None',
    Holo: false,
    Favorite: false,
    Copies: 1,
    UseColor: false,
    Color: '#22d3ee',
    Size: 240
};

const Query = (Selector, Root = document) => Root.querySelector(Selector);
const QueryAll = (Selector, Root = document) => [...Root.querySelectorAll(Selector)];

const Escape = (Value) =>
    String(Value).replace(/[&<>"']/g, (Char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[Char]);

const ReduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const TierClass = (Tier) => 't-' + Tier.toLowerCase();
const TierIndex = (Tier) => Math.max(0, Tiers.slice(0, 7).indexOf(Tier));

const LoadState = () => {
    try {
        const Saved = JSON.parse(localStorage.getItem(StorageKey) || '{}');
        const Merged = { ...Defaults, ...Saved };
        if (!Tiers.includes(Merged.Tier)) Merged.Tier = Defaults.Tier;
        return Merged;
    } catch {
        return { ...Defaults };
    }
};

const SaveState = () => {
    try {
        localStorage.setItem(StorageKey, JSON.stringify(State));
    } catch {
        try {
            localStorage.setItem(StorageKey, JSON.stringify({ ...State, ThumbData: '' }));
        } catch {}
    }
};

const ParseThumbUrl = (Url) => {
    const Match = Url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return Match ? `https://i.ytimg.com/vi/${Match[1]}/mqdefault.jpg` : Url;
};

const ThumbTransform = () => `transform:translate(${State.ThumbX.toFixed(2)}%, ${State.ThumbY.toFixed(2)}%) scale(${State.ThumbZoom.toFixed(3)})`;

let ImageFit = 1;

const FitWidth = () => Math.max(1, ImageFit);
const FitHeight = () => Math.max(1, 1 / ImageFit) * WindowAspect;

const ClampThumb = () => {
    State.ThumbZoom = Math.min(MaxZoom, Math.max(MinZoom, Number(State.ThumbZoom) || 1));
    const LimitX = (FitWidth() * State.ThumbZoom / 2 + 0.5) * 100;
    const LimitY = ((FitHeight() * State.ThumbZoom / 2 + 0.5 * WindowAspect) / WindowAspect) * 100;
    State.ThumbX = Math.min(LimitX, Math.max(-LimitX, Number(State.ThumbX) || 0));
    State.ThumbY = Math.min(LimitY, Math.max(-LimitY, Number(State.ThumbY) || 0));
};

const ApplyZoom = (NewZoom) => {
    const Old = State.ThumbZoom || 1;
    const Next = Math.min(MaxZoom, Math.max(MinZoom, NewZoom));
    State.ThumbX = (State.ThumbX * Next) / Old;
    State.ThumbY = (State.ThumbY * Next) / Old;
    State.ThumbZoom = Next;
};

const ResetThumbPosition = () => {
    State.ThumbZoom = 1;
    State.ThumbX = 0;
    State.ThumbY = 0;
};

const ResolveThumb = () => State.ThumbData || ParseThumbUrl(State.ThumbUrl.trim());
const CardName = () => State.Name.trim() || 'Untitled';

const RankText = () => {
    const Value = State.Rank.trim();
    if (!Value) return '-';
    return State.ShowHash ? '#' + Value : Value;
};

const NewTag = () =>
    State.NewMode === 'None'
        ? ''
        : `<span class="own-tag new pack-tag">${State.NewMode === 'NewHolo' ? '✦ NEW HOLO' : '✦ NEW'}</span>`;

const BuildPreview = () => `${BuildCard()}${NewTag()}`;

const BuildCard = () => {
    const Tier = State.Tier;
    const TierIdx = TierIndex(Tier);
    const Name = CardName();
    const Rank = RankText();
    const Badge = (State.BadgeText.trim() || Tier).toUpperCase();
    const RankStyle = Rank.length > 4 ? ` style="font-size:clamp(0.6rem, ${(44 / Rank.length).toFixed(2)}cqi, 1.6rem)"` : '';
    const Copies = Math.max(0, Math.floor(Number(State.Copies)) || 0);
    const Thumb = ResolveThumb();
    const Sparkles =
        State.Holo && TierIdx >= 3
            ? Array.from({ length: 2 + TierIdx }, (_, I) =>
                  `<span class="sparkle" style="left:${(I * 37) % 90 + 5}%;top:${(I * 53) % 85 + 5}%;animation-delay:${(I * 0.4).toFixed(1)}s"></span>`
              ).join('')
            : '';
    const Label = `${Rank} ${Name}, ${Tier}${State.Holo ? ', holographic' : ''}${State.NewMode !== 'None' ? ', new' : ''}${Copies > 1 ? `, ${Copies} copies` : ''}`;
    const Style = State.UseColor ? ` style="--tc:${Escape(State.Color)}"` : '';
    const ThumbHtml = Thumb
        ? `<img src="${Escape(Thumb)}" alt="" decoding="async" referrerpolicy="no-referrer" style="${ThumbTransform()}" data-ph="${Escape(Name)}">`
        : `<div class="ph">${Escape(Name)}</div>`;
    const CopiesHtml = Copies > 1 ? `<span class="copies-chip" title="${Copies} copies">×${Copies}</span>` : '';

    return `<div class="card ${TierClass(Tier)} ${State.Holo ? 'holo' : ''} ${State.NewMode !== 'None' ? 'NewRing' : ''}" aria-label="${Escape(Label)}"${Style}>
    <div class="card-inner">
      <div class="card-top"><span class="rank"${RankStyle}>${Escape(Rank)}</span><span class="tier-badge">${Escape(Badge)}</span></div>
      ${CopiesHtml}
      <div class="thumb">${ThumbHtml}</div>
      <div class="card-body">
        <div class="card-name" translate="no">${Escape(Name)}</div>
        <div class="card-meta">${Escape(State.Line1.trim())}</div>
        <div class="card-meta">${Escape(State.Line2.trim())}</div>
        <div class="card-foot">
          <span>${State.Holo ? '<span class="holo-badge">✦ HOLO</span>' : ''}</span>
          <span>${State.Favorite ? '<span class="fav" title="Favorite">★</span>' : ''}</span>
        </div>
      </div>
    </div>
    <div class="foil"></div><div class="glare"></div>${Sparkles}
  </div>`;
};

const BuildEdges = () =>
    Array.from({ length: EdgeCount }, (_, I) => {
        const Depth = ((I - (EdgeCount - 1) / 2) * 0.6).toFixed(2);
        const Accent = State.UseColor ? `;--tc:${Escape(State.Color)}` : '';
        return `<div class="inspect-edge ${TierClass(State.Tier)}" style="transform:translateZ(${Depth}px)${Accent}"></div>`;
    }).join('');

const BuildFront = () => `${BuildCard()}<div class="inspect-shade"></div>`;

const BuildViewer = () => `<div class="inspect" tabindex="0" aria-label="3D view of ${Escape(CardName())}. Drag or use the arrow keys to turn it, F to flip, R to reset.">
    <div class="inspect-stage"><div class="inspect-card">
      ${BuildEdges()}
      <div class="inspect-face front">${BuildFront()}</div>
      <div class="inspect-face back"><div class="card-back"></div><div class="glare"></div><div class="inspect-shade"></div></div>
    </div></div>
    <div class="row inspect-tools"><button type="button" class="btn sm" data-act="flip">Flip</button><button type="button" class="btn sm" data-act="reset">Reset</button><span class="muted small">Drag to spin</span></div></div>`;

const WireViewer = (Box) => {
    const Body = Query('.inspect-card', Box);
    const Stage3D = Query('.inspect-stage', Box);
    const FaceF = Query('.inspect-face.front', Box);
    const FaceB = Query('.inspect-face.back', Box);
    const IdleSpin = ReduceMotion() ? 0 : 0.012;
    const IdleAfter = 3000;
    const Rad = Math.PI / 180;
    let Touched = -Infinity;
    let Rx = -8;
    let Ry = -18;
    let Vx = 0;
    let Vy = 0;
    let Drag = null;
    let Raf = 0;
    let Last = 0;
    let Target = null;
    let Samples = [];

    const Draw = () => {
        const Front = Query('.card', FaceF);
        Body.style.transform = `rotateX(${Rx}deg) rotateY(${Ry}deg)`;
        const Facing = Math.cos(Rx * Rad) * Math.cos(Ry * Rad);
        FaceF.style.visibility = Facing > -0.02 ? 'visible' : 'hidden';
        FaceB.style.visibility = Facing < 0.02 ? 'visible' : 'hidden';
        Box.style.setProperty('--shade-front', (0.55 * (1 - Math.max(0, Facing))).toFixed(3));
        Box.style.setProperty('--shade-back', (0.55 * (1 - Math.max(0, -Facing))).toFixed(3));
        const Gx = `${50 - Math.sin(Ry * Rad) * 90}%`;
        const Gy = `${50 + Math.sin(Rx * Rad) * 90}%`;
        const Fx = `${50 - Math.sin(Ry * Rad) * 50}%`;
        const Fy = `${50 + Math.sin(Rx * Rad) * 50}%`;
        for (const El of [Front, FaceB]) {
            if (!El) continue;
            El.style.setProperty('--mx', Gx);
            El.style.setProperty('--my', Gy);
            El.style.setProperty('--fx', Fx);
            El.style.setProperty('--fy', Fy);
            El.style.setProperty('--hue', `${(Math.sin(Ry * Rad) - Math.sin(Rx * Rad)) * 150}deg`);
        }
    };

    const Tick = (Now) => {
        const Dt = Math.min(50, Now - (Last || Now));
        Last = Now;
        Raf = 0;
        if (!Box.isConnected) return;
        const Idle = IdleSpin && !Drag && !Target && !Vx && !Vy && Now - Touched > IdleAfter;
        if (Idle) {
            Ry += IdleSpin * Dt;
        } else if (Target) {
            const K = 1 - Math.exp(-Dt / 90);
            Rx += (Target.Rx - Rx) * K;
            Ry += (Target.Ry - Ry) * K;
            if (Math.abs(Target.Rx - Rx) + Math.abs(Target.Ry - Ry) < 0.05) {
                Rx = Target.Rx;
                Ry = Target.Ry;
                Target = null;
            }
        } else if (!Drag) {
            Rx += Vx * Dt;
            Ry += Vy * Dt;
            const Decay = Math.exp(-Dt / 380);
            Vx *= Decay;
            Vy *= Decay;
            if (Math.hypot(Vx, Vy) < 0.004) Vx = Vy = 0;
        }
        Draw();
        if (Target || (!Drag && (Vx || Vy)) || IdleSpin) Raf = requestAnimationFrame(Tick);
        else Last = 0;
    };

    const Go = () => {
        if (!Raf) Raf = requestAnimationFrame(Tick);
    };

    const TurnTo = (X, Y) => {
        Vx = Vy = 0;
        Touched = performance.now();
        Target = { Rx: X, Ry: Y };
        Go();
    };

    Stage3D.addEventListener('pointerdown', (Ev) => {
        Ev.preventDefault();
        if (Drag) return;
        Stage3D.setPointerCapture(Ev.pointerId);
        Drag = { Id: Ev.pointerId, X: Ev.clientX, Y: Ev.clientY };
        Target = null;
        Vx = Vy = 0;
        Samples = [];
        Touched = performance.now();
    });

    Stage3D.addEventListener('pointermove', (Ev) => {
        if (!Drag || Ev.pointerId !== Drag.Id) return;
        const Dx = Ev.clientX - Drag.X;
        const Dy = Ev.clientY - Drag.Y;
        const FlipX = Math.cos(Rx * Rad) < 0 ? -1 : 1;
        Ry += Dx * 0.5 * FlipX;
        Rx -= Dy * 0.5;
        Drag = { Id: Drag.Id, X: Ev.clientX, Y: Ev.clientY };
        const Now = performance.now();
        Samples.push({ T: Now, Rx, Ry });
        Samples = Samples.filter((Point) => Now - Point.T < 80);
        Draw();
    });

    const End = (Ev) => {
        if (!Drag || Ev.pointerId !== Drag.Id) return;
        Drag = null;
        Touched = performance.now();
        const Now = performance.now();
        const First = Samples[0];
        const LastSample = Samples[Samples.length - 1];
        if (First && LastSample !== First && Now - LastSample.T < 50) {
            const Span = LastSample.T - First.T;
            const Cap = 1.6;
            Vx = Math.max(-Cap, Math.min(Cap, (LastSample.Rx - First.Rx) / Span));
            Vy = Math.max(-Cap, Math.min(Cap, (LastSample.Ry - First.Ry) / Span));
        }
        Go();
    };

    Stage3D.addEventListener('pointerup', End);
    Stage3D.addEventListener('pointercancel', End);
    Box.addEventListener('dragstart', (Ev) => Ev.preventDefault());

    const Flip = () => TurnTo(Rx, Math.round((Ry + 180) / 180) * 180);
    const Reset = () => TurnTo(Math.round(Rx / 360) * 360 - 8, Math.round(Ry / 360) * 360 - 18);

    Box.addEventListener('click', (Ev) => {
        const Action = Ev.target.closest('[data-act]')?.dataset.act;
        if (Action === 'flip') Flip();
        else if (Action === 'reset') Reset();
    });

    Box.addEventListener('keydown', (Ev) => {
        const Turn = {
            ArrowLeft: [0, -20],
            ArrowRight: [0, 20],
            ArrowUp: [20, 0],
            ArrowDown: [-20, 0]
        }[Ev.key];
        if (Turn) {
            Ev.preventDefault();
            TurnTo((Target?.Rx ?? Rx) + Turn[0], (Target?.Ry ?? Ry) + Turn[1]);
        } else if (Ev.key === 'f' || Ev.key === 'F') Flip();
        else if (Ev.key === 'r' || Ev.key === 'R') Reset();
    });

    Draw();
    Go();

    return { Draw };
};

const State = LoadState();
const Form = Query('#CardForm');
const Stage = Query('#PreviewStage');
const ColorInput = Query('#ColorInput');
const SizeOutput = Query('#SizeOutput');
const ThumbNote = Query('#ThumbNote');
const ThumbFile = Query('#ThumbFile');
const ThumbEditor = Query('#ThumbEditor');
const ThumbFrame = Query('#ThumbFrame');
const ThumbEditImg = Query('#ThumbEditImg');
const ThumbBox = Query('#ThumbBox');
const GuideV = Query('#GuideV');
const GuideH = Query('#GuideH');
let EditorScale = 1;
const ZoomOutput = Query('#ZoomOutput');
let Mode = 'Card';
let Viewer = null;

const BuildStage = () => {
    Viewer = null;
    if (Mode === 'Card') {
        Stage.innerHTML = `<div class="PreviewCard">${BuildPreview()}</div>`;
    } else {
        Stage.innerHTML = BuildViewer();
        Viewer = WireViewer(Query('.inspect', Stage));
    }
};

const Render = () => {
    if (Mode === 'Card') {
        const Host = Query('.PreviewCard', Stage);
        if (Host) Host.innerHTML = BuildPreview();
        return;
    }
    const Box = Query('.inspect', Stage);
    if (!Box) return;
    Box.setAttribute(
        'aria-label',
        `3D view of ${CardName()}. Drag or use the arrow keys to turn it, F to flip, R to reset.`
    );
    Query('.inspect-face.front', Box).innerHTML = BuildFront();
    QueryAll('.inspect-edge', Box).forEach((Edge) => {
        Edge.className = `inspect-edge ${TierClass(State.Tier)}`;
        if (State.UseColor) Edge.style.setProperty('--tc', State.Color);
        else Edge.style.removeProperty('--tc');
    });
    if (Viewer) Viewer.Draw();
};

const UpdateEditor = () => {
    const FrameWidth = ThumbFrame.clientWidth;
    const FrameHeight = ThumbFrame.clientHeight;
    if (!FrameWidth || !FrameHeight) return;
    const Scale = Math.min((FrameWidth * 0.72) / FitWidth(), (FrameHeight * 0.72) / FitHeight());
    EditorScale = Scale;
    const Zoom = State.ThumbZoom;
    ThumbEditImg.style.width = `${FitWidth() * Scale}px`;
    ThumbEditImg.style.height = `${FitHeight() * Scale}px`;
    const CenterX = FrameWidth / 2 + (-State.ThumbX / 100 / Zoom) * Scale;
    const CenterY = FrameHeight / 2 + ((-State.ThumbY / 100) * WindowAspect / Zoom) * Scale;
    ThumbBox.style.width = `${Scale / Zoom}px`;
    ThumbBox.style.height = `${(Scale * WindowAspect) / Zoom}px`;
    ThumbBox.style.left = `${CenterX}px`;
    ThumbBox.style.top = `${CenterY}px`;
    GuideV.classList.toggle('Active', State.ThumbX === 0);
    GuideH.classList.toggle('Active', State.ThumbY === 0);
};

const Sync = () => {
    ColorInput.disabled = !State.UseColor;
    SizeOutput.textContent = `${State.Size}px`;
    ThumbNote.hidden = !State.ThumbData;
    Stage.style.setProperty('--PreviewWidth', `${State.Size}px`);
    ClampThumb();
    QueryAll('input[type="range"]').forEach((Range) => {
        const Min = Number(Range.min);
        const Span = Number(Range.max) - Min;
        const Value = State[Range.dataset.key];
        Range.style.setProperty('--val', `${((Value - Min) / Span) * 100}%`);
    });
    ZoomOutput.textContent = `${State.ThumbZoom.toFixed(2)}x`;
    const Thumb = ResolveThumb();
    ThumbEditor.hidden = !Thumb;
    if (Thumb && ThumbEditImg.getAttribute('src') !== Thumb) ThumbEditImg.src = Thumb;
    UpdateEditor();
    Render();
    SaveState();
};

const Fill = () => {
    QueryAll('[data-key]').forEach((Control) => {
        const Value = State[Control.dataset.key];
        if (Control.type === 'checkbox') Control.checked = !!Value;
        else Control.value = Value;
    });
    Sync();
};

const SetMode = (NewMode) => {
    Mode = NewMode;
    QueryAll('[data-mode]').forEach((Tab) => Tab.setAttribute('aria-selected', Tab.dataset.mode === Mode));
    BuildStage();
    Sync();
};

document.addEventListener('input', (Ev) => {
    const Control = Ev.target;
    const Key = Control.dataset?.key;
    if (!Key || !(Key in Defaults)) return;
    if (Control.type === 'checkbox') State[Key] = Control.checked;
    else if (Key === 'ThumbZoom') ApplyZoom(Number(Control.value));
    else if (Control.type === 'range' || Control.type === 'number') State[Key] = Number(Control.value);
    else State[Key] = Control.value;
    if (Key === 'ThumbUrl') {
        State.ThumbData = '';
        ResetThumbPosition();
    }
    Sync();
});

QueryAll('[data-mode]').forEach((Tab) => Tab.addEventListener('click', () => SetMode(Tab.dataset.mode)));

Query('#UploadButton').addEventListener('click', () => ThumbFile.click());

Query('#ClearThumbButton').addEventListener('click', () => {
    State.ThumbUrl = '';
    State.ThumbData = '';
    ResetThumbPosition();
    Fill();
});

ThumbFile.addEventListener('change', () => {
    const Picked = ThumbFile.files[0];
    if (!Picked) return;
    const Reader = new FileReader();
    Reader.onload = () => {
        State.ThumbData = String(Reader.result);
        State.ThumbUrl = '';
        ResetThumbPosition();
        Fill();
    };
    Reader.readAsDataURL(Picked);
    ThumbFile.value = '';
});

Query('#ResetButton').addEventListener('click', () => {
    Object.assign(State, Defaults);
    Fill();
});

Query('#ResetPositionButton').addEventListener('click', () => {
    ResetThumbPosition();
    Fill();
});

Query('#CenterButton').addEventListener('click', () => {
    State.ThumbX = 0;
    State.ThumbY = 0;
    Sync();
});

ThumbEditImg.addEventListener('load', () => {
    if (ThumbEditImg.naturalWidth && ThumbEditImg.naturalHeight) {
        ImageFit = ThumbEditImg.naturalWidth / ThumbEditImg.naturalHeight / (16 / 9);
    }
    Sync();
});

window.addEventListener('resize', () => UpdateEditor());

let ThumbDrag = null;

ThumbFrame.addEventListener('pointerdown', (Ev) => {
    Ev.preventDefault();
    ThumbFrame.setPointerCapture(Ev.pointerId);
    ThumbDrag = {
        Id: Ev.pointerId,
        StartX: Ev.clientX,
        StartY: Ev.clientY,
        FromX: State.ThumbX,
        FromY: State.ThumbY,
        Axis: null
    };
});

ThumbFrame.addEventListener('pointermove', (Ev) => {
    if (!ThumbDrag || Ev.pointerId !== ThumbDrag.Id) return;
    let Dx = Ev.clientX - ThumbDrag.StartX;
    let Dy = Ev.clientY - ThumbDrag.StartY;
    let Axis = State.ThumbLock === 'Horizontal' ? 'X' : State.ThumbLock === 'Vertical' ? 'Y' : null;
    if (!Axis && Ev.shiftKey) {
        if (!ThumbDrag.Axis && Math.hypot(Dx, Dy) > 4) ThumbDrag.Axis = Math.abs(Dx) >= Math.abs(Dy) ? 'X' : 'Y';
        Axis = ThumbDrag.Axis;
    } else if (!Ev.shiftKey) {
        ThumbDrag.Axis = null;
    }
    if (Axis === 'X') Dy = 0;
    if (Axis === 'Y') Dx = 0;
    const Zoom = State.ThumbZoom;
    let X = ThumbDrag.FromX - ((Dx / EditorScale) * Zoom * 100);
    let Y = ThumbDrag.FromY - ((Dy / EditorScale) * Zoom * 100) / WindowAspect;
    const PixelX = (X / 100 / Zoom) * EditorScale;
    const PixelY = (((Y / 100) * WindowAspect) / Zoom) * EditorScale;
    if (Math.abs(PixelX) < SnapPixels) X = 0;
    if (Math.abs(PixelY) < SnapPixels) Y = 0;
    State.ThumbX = X;
    State.ThumbY = Y;
    Sync();
});

const EndThumbDrag = (Ev) => {
    if (ThumbDrag && Ev.pointerId === ThumbDrag.Id) ThumbDrag = null;
};

ThumbFrame.addEventListener('pointerup', EndThumbDrag);
ThumbFrame.addEventListener('pointercancel', EndThumbDrag);

ThumbFrame.addEventListener(
    'wheel',
    (Ev) => {
        Ev.preventDefault();
        ApplyZoom(State.ThumbZoom * Math.exp(-Ev.deltaY * 0.0015));
        Sync();
    },
    { passive: false }
);

const ThumbFallback = (Ev) => {
    const Img = Ev.target;
    if (Img.tagName !== 'IMG' || !Img.dataset.ph) return;
    if (Ev.type === 'load' && (Img.naturalWidth !== 120 || Img.src.startsWith('data:'))) return;
    const Placeholder = document.createElement('div');
    Placeholder.className = 'ph';
    Placeholder.textContent = Img.dataset.ph;
    Img.replaceWith(Placeholder);
};

document.addEventListener('error', ThumbFallback, true);
document.addEventListener('load', ThumbFallback, true);

const LogoIcon = Query('#LogoIcon');
LogoIcon.addEventListener('error', () => LogoIcon.remove());
if (LogoIcon.complete && LogoIcon.naturalWidth === 0) LogoIcon.remove();

Stage.addEventListener('pointermove', (Ev) => {
    const El = Ev.target.closest?.('.card');
    if (!El || Ev.pointerType !== 'mouse' || ReduceMotion() || El.closest('.inspect')) return;
    const Box = El.getBoundingClientRect();
    const X = (Ev.clientX - Box.left) / Box.width;
    const Y = (Ev.clientY - Box.top) / Box.height;
    El.style.setProperty('--mx', `${X * 100}%`);
    El.style.setProperty('--my', `${Y * 100}%`);
    El.style.setProperty('--hue', `${(X + Y - 1) * 150}deg`);
    El.style.setProperty('--rx', `${(X - 0.5) * 14}deg`);
    El.style.setProperty('--ry', `${(0.5 - Y) * 14}deg`);
});

Stage.addEventListener('pointerout', (Ev) => {
    const El = Ev.target.closest?.('.card');
    if (El && !El.contains(Ev.relatedTarget)) {
        El.style.removeProperty('--rx');
        El.style.removeProperty('--ry');
    }
});

BuildStage();
Fill();