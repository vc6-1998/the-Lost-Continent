; (function () {
    if (!window.normalizeActions || !window.normalizeInteraction) {
        console.warn('[ContentNormalizer] ���� normalize.js δ���أ���ȷ������˳��Ӧ�������ر��ļ���');
    }

    const toArray = (x) => (Array.isArray(x) ? x : (x ? [x] : []));
    const isPlainObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

    function createDownload(name, obj) {
        try {
            const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
            console.log('[ContentNormalizer] �Ѵ������أ�', name);
        } catch (e) {
            console.error('[ContentNormalizer] ����ʧ�ܣ�', e);
        }
    }

    function findStoryRoot() {
        const candidates = [
            ['storyData', window.storyData],
            ['story', window.story],
            ['STORY', window.STORY],
            ['Story', window.Story],
            ['chapters', window.chapters]
        ];
        for (const [name, val] of candidates) {
            if (Array.isArray(val)) return { name, get: () => val, set: (v) => (window[name] = v) };
        }
        if (window.story && Array.isArray(window.story.data)) {
            return { name: 'story.data', get: () => window.story.data, set: (v) => (window.story.data = v) };
        }
        return null;
    }

    function isLikelyMapData(x) {
        if (!isPlainObj(x)) return false;
        // �߱�������һ������������ MapData
        if (Array.isArray(x.can_interact) || Array.isArray(x.interact) || Array.isArray(x.interactions)) return true;
        if (typeof x.name === 'string' && (x.width || x.height || x.tileset)) return true;
        return false;
    }

    function findAllMapData() {
        const seen = new Set();
        const maps = [];

        const known = ['MapData', 'mapData', 'Maps', 'maps'];
        for (const k of known) {
            const v = window[k];
            if (isPlainObj(v) && isLikelyMapData(v)) {
                if (!seen.has(v)) { seen.add(v); maps.push([k, v]); }
            } else if (Array.isArray(v)) {
                v.forEach((o, i) => {
                    if (isPlainObj(o) && isLikelyMapData(o) && !seen.has(o)) {
                        seen.add(o); maps.push([`${k}[${i}]`, o]);
                    }
                });
            }
        }

        let count = 0;
        for (const k in window) {
            if (count++ > 800) break;
            try {
                const v = window[k];
                if (isPlainObj(v) && isLikelyMapData(v) && !seen.has(v)) {
                    seen.add(v); maps.push([k, v]);
                }
            } catch { }
        }

        return maps;
    }

    // ------- �淶���߼� -------
    function normalizeStoryArray(arr) {
        if (!Array.isArray(arr)) return arr;
        // �� item ͳһΪ���������顱��ʽ
        return arr.map((el) => {
            if (!el || !el.type) return el;
            // ������Ԫ��תΪ��׼���������ٻ�ԭΪ���������顱����
            const norm = window.normalizeActions ? window.normalizeActions(el) : el;
            // ��� normalizeActions ���ص��Ƕ��󣨵�����������ת������
            return Array.isArray(norm) ? norm : [norm];
        }).flat(); // չ��Ϊ����������StoryController ��֧�ֶ���ִ�У�
    }

    function normalizeMapInteractions(obj) {
        // ���ݶ���ֶ�����actions / interact / interactions / can_interact
        const fields = ['actions', 'interact', 'interactions', 'can_interact'];
        let changed = 0;

        for (const key of fields) {
            const val = obj[key];
            if (!val) continue;

            const list = toArray(val);
            const out = [];
            for (const inter of list) {
                const n = window.normalizeInteraction ? window.normalizeInteraction(inter) : inter;
                // ͬʱ�ԡ�������Ķ������顱�� normalizeActions������ {type:'map'} �ȣ�
                const actsRaw = n.actions || n.interact || [];
                const acts = window.normalizeActions ? window.normalizeActions(actsRaw) : actsRaw;
                const n2 = Object.assign({}, n, { actions: acts });
                out.push(n2);
                changed++;
            }

            // д��ͳһ�ֶ� actions������ԭ�ֶ��԰�ȫ����
            obj.actions = out;
        }
        return changed;
    }

    // ------- ���� API -------
    const ContentNormalizer = {
        report() {
            const rep = { story: { found: false, length: 0 }, maps: [] };

            // Story
            const root = findStoryRoot();
            if (root) {
                const arr = root.get();
                rep.story.found = true;
                rep.story.length = Array.isArray(arr) ? arr.length : 0;

                // ����ͳ�ơ����ƾ�д����
                let legacyMap = 0, legacyChoiceEffects = 0;
                toArray(arr).forEach((el) => {
                    const t = el && el.type;
                    if (t === 'map') legacyMap++;
                    if (t === 'choice' && Array.isArray(el.options)) {
                        el.options.forEach(op => { if (op && (op.effects && !op.actions)) legacyChoiceEffects++; });
                    }
                });
                rep.story.legacyMap = legacyMap;
                rep.story.legacyChoiceEffects = legacyChoiceEffects;
            }

            // Maps
            const maps = findAllMapData();
            maps.forEach(([name, data]) => {
                // ���Թ��ƽ�������
                const all = [].concat(
                    toArray(data.actions),
                    toArray(data.interact),
                    toArray(data.interactions),
                    toArray(data.can_interact)
                ).filter(Boolean);
                rep.maps.push({ name, approxInteractions: all.length });
            });

            console.table(rep.maps);
            console.log('[ContentNormalizer][report]', rep);
            return rep;
        },

        applyInMemory() {
            // Story
            const root = findStoryRoot();
            if (root) {
                const oldArr = root.get();
                const newArr = normalizeStoryArray(oldArr);
                root.set(newArr);
                console.log('[ContentNormalizer] Story �����ڴ��й淶����', { before: oldArr?.length, after: newArr?.length });
            } else {
                console.warn('[ContentNormalizer] δ���ֿ�ʶ��� Story ����storyData / story / STORY ...��');
            }

            // Maps
            const maps = findAllMapData();
            let totalChanged = 0;
            maps.forEach(([name, data]) => {
                const changed = normalizeMapInteractions(data);
                totalChanged += changed;
                console.log(`[ContentNormalizer] Map ${name} �����ѹ淶�����Ķ� ${changed} ����`);
            });
            console.log('[ContentNormalizer] ���е�ͼ�����淶����ɣ��ܸĶ���', totalChanged);
        },

        download() {
            // Story ����
            const root = findStoryRoot();
            if (root) {
                const arr = root.get();
                createDownload('normalized_story.json', arr);
            } else {
                console.warn('[ContentNormalizer] δ���� Story����������');
            }

            // Maps ���������� + ����ժҪ��
            const maps = findAllMapData();
            const pack = maps.map(([name, data]) => {
                const minimal = { name, actions: toArray(data.actions) };
                return minimal;
            });
            createDownload('normalized_maps.json', pack);
        }
    };

    Object.defineProperty(window, 'ContentNormalizer', { value: ContentNormalizer, enumerable: true });

    if (!window.__DEV__) window.__DEV__ = true;
    if (window.__DEV__) console.log('[ContentNormalizer] ready: report()/applyInMemory()/download()');
})();
