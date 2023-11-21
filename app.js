/*
This code is based on
Michael Huebler, The New Master Lock® Speed Dial™ / ONE™ Combination Padlock – An Inside View. Version 2.0 (HAR2009 Edition), July 2009
https://toool.nl/images/e/e5/The_New_Master_Lock_Combination_Padlock_V2.0.pdf

Have a nice spaghetti🍝!

Copyright 2023. 박따뜻(fainthit@kakao.com) All rights reserved.
*/

function inputComb(combinations) {
    let CD = getResetState(); //CD stands for "Current Disks". Sorry for acronyms
    for (let i = 0; i < combinations.length; i++) {
        CD = moveKnob(CD, combinations[i]);
    }
    return CD;
}

function getResetState() {
    return {
        U: { n: 0, m: 0 },
        L: { n: 0, m: 0 },
        D: { n: 0, m: 0 },
        R: { n: 0, m: 0 },
    };
}

function moveKnob(CD, dir) {
    const Copied = copyDisks(CD);
    const n2d = ["U", "L", "D", "R"];
    const d2n = { U: 0, L: 1, D: 2, R: 3 };

    for (let i = -1; i <= 1; i++) {
        const currentDir = n2d[putNumInRange(d2n[dir] - i, 4)];
        const CCD = Copied[currentDir]; //stands for Current CD :)
        Copied[currentDir] = movePin(CCD.n, CCD.m, i);
    }
    return Copied;
}

function movePin(n, originM, pin) {
    return {
        n: putNumInRange(n + (originM < pin ? 0 : 1), 5),
        m: pin,
    };
}

function calcAngle(disk) {
    return putNumInRange(disk.n * 72 + disk.m * 24, 360);
}

function putNumInRange(value, range) {
    let result = value % range;
    if (result < 0) return range + result;
    else return result;
}

function getEntireSeed(CD) {
    return getNBasedNum(
        [
            getDiskSeed(CD.U),
            getDiskSeed(CD.L),
            getDiskSeed(CD.D),
            getDiskSeed(CD.R),
        ],
        15
    );
}

function getDiskSeed(disk) {
    return disk.n + (disk.m + 1) * 5;
}

function getNBasedNum(arr, n) {
    let result = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
        result += Math.pow(n, arr.length - i - 1) * arr[i];
    }
    return result;
}

function copyDisks(D) {
    const copied = {};
    for (let dir of ["U", "L", "D", "R"]) {
        copied[dir] = { n: D[dir].n, m: D[dir].m };
    }
    return copied;
}

/* ---- Below codes are for searching duplicated combinations ---- */

let lastTick; //Shit. I made a global variable again
async function searchInRange(
    min,
    max,
    target,
    currentCombinationCallback = () => {},
    realtime = false
) {
    if (realtime) lastTick = new Date().getTime();

    let duplicated = [];
    for (let i = min; i <= max; i++) {
        duplicated = duplicated.concat(
            await searchDuplicated(
                i,
                target,
                currentCombinationCallback,
                realtime
            )
        );
    }
    return duplicated;
}
async function searchDuplicated(
    length,
    target,
    currentCombinationCallback,
    realtime = false,
    prvComb = "",
    prvDisks = null
) {
    if (prvComb.length === length) {
        currentCombinationCallback(prvComb);

        if (prvDisks === null) prvDisks = inputComb(prvComb);
        const currentSeed = getEntireSeed(prvDisks);

        if (currentSeed === target) return [prvComb];
        else return [];
    } else {
        if (realtime) {
            const present = new Date().getTime();
            if (present - lastTick > 10) {
                await tick();
                lastTick = present;
            }
        }

        let results = [];
        for (let dir of ["U", "L", "D", "R"]) {
            const currentComb = prvComb + dir;
            const currentDisks = prvDisks
                ? moveKnob(prvDisks, dir)
                : inputComb(currentComb);
            let combs = await searchDuplicated(
                length,
                target,
                currentCombinationCallback,
                realtime,
                currentComb,
                currentDisks
            );
            results = results.concat(combs);
        }
        return results;
    }
}

function tick() {
    return new Promise((res) => requestAnimationFrame(res));
}

/* ---- Below codes for about input and output ---- */

const DirInput = document.getElementById("dirs");
const SearchTarget = document.getElementById("searchTarget");
const MinLength = document.getElementById("minLength");
const MaxLength = document.getElementById("maxLength");
const TargetSeed = document.getElementById("targetSeed");
const CurrentComb = document.getElementById("currentComb");
const SearchResult = document.getElementById("result");
const SearchBtn = document.getElementById("searchBtn");
const CalcTime = document.getElementById("calcTime");
const RealTime = document.getElementById("realtime");

const D = {
    //D stands for "Displays"
    seed: document.getElementById("seed"),
    disk: {
        U: {
            n: document.getElementById("n-u"),
            m: document.getElementById("m-u"),
            a: document.getElementById("a-u"),
        },
        L: {
            n: document.getElementById("n-l"),
            m: document.getElementById("m-l"),
            a: document.getElementById("a-l"),
        },
        D: {
            n: document.getElementById("n-d"),
            m: document.getElementById("m-d"),
            a: document.getElementById("a-d"),
        },
        R: {
            n: document.getElementById("n-r"),
            m: document.getElementById("m-r"),
            a: document.getElementById("a-r"),
        },
    },
};

const DiskImgs = {
    U: document.getElementById("disk-u"),
    L: document.getElementById("disk-l"),
    D: document.getElementById("disk-d"),
    R: document.getElementById("disk-r"),
};

function display(CD) {
    for (disk in CD) {
        const angle = calcAngle(CD[disk]);
        D.disk[disk].n.value = CD[disk].n;
        D.disk[disk].m.value = CD[disk].m;
        D.disk[disk].a.value = angle;

        DiskImgs[disk].style.transform = `rotate(-${angle}deg)`;
    }
    D.seed.value = getEntireSeed(CD);
}

DirInput.addEventListener("keydown", (evt) => {
    if (evt.shiftKey || evt.ctrlKey) return;
    if (evt.key === "ArrowUp") addToCombination("U");
    else if (evt.key === "ArrowLeft") addToCombination("L");
    else if (evt.key === "ArrowDown") addToCombination("D");
    else if (evt.key === "ArrowRight") addToCombination("R");
    else return;

    evt.preventDefault();
    handleInput();
});

DirInput.addEventListener("input", handleInput);

function handleInput() {
    const combinations = DirInput.value.toUpperCase().replace(/[^ULDR]/g, "");
    setCombination(combinations);

    const CD = inputComb(combinations);
    display(CD);
}

function addToCombination(dir) {
    DirInput.value += dir;
}
function setCombination(str) {
    DirInput.value = str;
}

SearchBtn.addEventListener("click", handleSearchBtn);

async function handleSearchBtn() {
    const startTime = new Date().getTime();
    const doesRealtime = RealTime.checked;

    SearchTarget.value = SearchTarget.value
        .toUpperCase()
        .replace(/[^ULDR]/g, "");
    const TargetSeedValue = getEntireSeed(inputComb(SearchTarget.value));
    TargetSeed.value = TargetSeedValue;
    CurrentComb.value = "";
    CalcTime.innerText = "?";
    SearchResult.innerHTML = "";
    await tick();

    const results = await searchInRange(
        Number(MinLength.value),
        Number(MaxLength.value),
        TargetSeedValue,
        (v) => {
            CurrentComb.value = v;
        },
        doesRealtime
    );
    CalcTime.innerText = new Date().getTime() - startTime;
    console.log(results);
    SearchResult.innerHTML = results.join("<br>");
}
