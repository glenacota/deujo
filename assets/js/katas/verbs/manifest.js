// katas/verbs/manifest.js
import { TENSES } from '../../services/grammar.js';

const SUBTITLE = 'Verb Conjugation';
const ACCENT = 'purple';
const DATASET_URL = './assets/datasets/verbs.json';

export function getVerbManifest(tenseKey) {
    const tense = TENSES[tenseKey];
    return {
        id: tense.id,
        name: tense.label,
        subtitle: SUBTITLE,
        datasetUrl: DATASET_URL,
        accent: ACCENT,
        helpTitle: `${tense.label} Conjugation`,
    };
}
