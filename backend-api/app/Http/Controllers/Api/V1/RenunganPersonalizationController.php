<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BibleVerse;
use App\Services\AI\RenunganAIService;
use App\Services\Renungan\RenunganMeditationQualityOrchestrator;
use App\Services\Renungan\RenunganPersonalizationPayloadAssembler;
use App\Services\Renungan\RenunganPersonalizationRequestMapper;
use App\Services\Renungan\RenunganPersonalizationResponseFinalizer;
use App\Services\Renungan\RenunganPersonalizationTelemetryBuilder;
use App\Services\Renungan\RenunganSearchTermBuilder;
use App\Services\RenunganPastoralInterpretationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RenunganPersonalizationController extends Controller
{
    private const PIPELINE_VERSION = 'renungan.v2.1.telemetry';
    private const VERSE_CANDIDATE_LIMIT = 160;

    private bool $usedFallbackContent = false;

    /**
     * Frontend emotional entry state -> analysis bias profile.
     *
     * @var array<string, array{theme: string, emotion: string, intent: string}>
     */
    private const ENTRY_STATE_PROFILE = [
        'overwhelmed' => ['theme' => 'fatigue', 'emotion' => 'exhausted', 'intent' => 'seek_comfort'],
        'disconnected' => ['theme' => 'loneliness', 'emotion' => 'sad', 'intent' => 'seek_comfort'],
        'clarity' => ['theme' => 'direction', 'emotion' => 'confused', 'intent' => 'guidance'],
        'connect' => ['theme' => 'surrender', 'emotion' => 'hopeful', 'intent' => 'seek_peace'],
        'neutral' => ['theme' => 'hope', 'emotion' => 'hopeful', 'intent' => 'seek_peace'],
    ];

    public function __construct(
        private RenunganPastoralInterpretationService $pastoralInterpretationService,
        private RenunganAIService $renunganAIService,
        private RenunganPersonalizationRequestMapper $requestMapper,
        private RenunganPersonalizationPayloadAssembler $payloadAssembler,
        private RenunganPersonalizationTelemetryBuilder $telemetryBuilder,
        private RenunganSearchTermBuilder $searchTermBuilder,
        private RenunganPersonalizationResponseFinalizer $responseFinalizer,
        private RenunganMeditationQualityOrchestrator $qualityOrchestrator,
    ) {
    }

    private const THEME_PROFILES = [
        'gratitude' => [
            'keywords' => ['syukur', 'bersyukur', 'berkat', 'puji', 'pujian', 'terima kasih', 'sukacita', 'bahagia', 'lega'],
            'emotion' => 'positive',
            'emotional_need' => 'syukur yang stabil',
            'spiritual_need' => 'hati yang menyembah',
            'intent' => 'mengucap syukur',
            'verse_hints' => ['bersyukur', 'sukacita', 'pujilah', 'kemurahan', 'setia'],
            'book_boost' => ['mzm', '1tes', 'kol', 'ef'],
            'preferred_verse_tone' => 'worshipful',
        ],
        'longing_family' => [
            'keywords' => ['rindu', 'kangen', 'merindukan', 'jauh', 'terpisah', 'pisah', 'anak', 'istri', 'suami', 'keluarga'],
            'emotion' => 'tender',
            'emotional_need' => 'dikuatkan dalam kerinduan',
            'spiritual_need' => 'penghiburan dan penjagaan Tuhan',
            'intent' => 'mempercayakan orang terkasih kepada Tuhan',
            'verse_hints' => ['menyertai', 'lindungi', 'pelihara', 'dekat', 'damai'],
            'book_boost' => ['mzm', 'yes', 'yoh', 'flp'],
            'preferred_verse_tone' => 'comforting',
        ],
        'relationship_conflict' => [
            'keywords' => ['bertengkar', 'konflik', 'marah', 'sakit hati', 'kecewa', 'disakiti', 'bermusuhan', 'rekonsiliasi'],
            'emotion' => 'resentful',
            'emotional_need' => 'hati yang tenang dan lembut',
            'spiritual_need' => 'kasih, pengampunan, dan pemulihan relasi',
            'intent' => 'memulihkan relasi',
            'verse_hints' => ['kasih', 'sabar', 'mengampuni', 'damai', 'lemah lembut'],
            'book_boost' => ['ef', 'kol', '1kor', 'rom', 'mzm'],
            'preferred_verse_tone' => 'restorative',
        ],
        'anger_conflict' => [
            'keywords' => ['marah', 'kesal', 'emosi', 'muak', 'jengkel', 'ingin memaki', 'ingin balas', 'dendam'],
            'emotion' => 'angry',
            'emotional_need' => 'hati yang ditenangkan',
            'spiritual_need' => 'kendali diri dan hikmat',
            'intent' => 'memproses amarah tanpa melukai',
            'verse_hints' => ['lambat untuk marah', 'jawab dengan lemah lembut', 'jaga lidah', 'damai', 'jangan membalas'],
            'book_boost' => ['yak', 'ef', 'ams', 'rom', 'mzm'],
            'preferred_verse_tone' => 'restraining',
        ],
        'hatred_hostility' => [
            'keywords' => ['benci', 'dendam', 'hancurin', 'sumpahin', 'maki', 'sakitin', 'balas dendam'],
            'emotion' => 'hostile',
            'emotional_need' => 'reda dari dorongan destruktif',
            'spiritual_need' => 'pertobatan dan damai',
            'intent' => 'melepas kebencian',
            'verse_hints' => ['jangan membalas kejahatan', 'kasihilah', 'berkatilah', 'jangan berkata kotor', 'damai'],
            'book_boost' => ['rom', 'ef', 'yak', 'ams', 'mat'],
            'preferred_verse_tone' => 'restraining',
        ],
        'anxiety' => [
            'keywords' => ['cemas', 'khawatir', 'takut', 'gelisah', 'panik', 'resah', 'kuatir', 'degdegan'],
            'emotion' => 'fearful',
            'emotional_need' => 'ketenangan',
            'spiritual_need' => 'percaya pemeliharaan Tuhan',
            'intent' => 'mencari rasa aman',
            'verse_hints' => ['jangan takut', 'jangan khawatir', 'damai', 'tenang', 'percaya'],
            'book_boost' => ['mzm', 'mat', 'yes', 'flp', 'yoh'],
            'preferred_verse_tone' => 'comforting',
        ],
        'fatigue' => [
            'keywords' => ['lelah', 'letih', 'capek', 'penat', 'burnout', 'habis tenaga', 'kelelahan', 'jenuh'],
            'emotion' => 'exhausted',
            'emotional_need' => 'kelegaan',
            'spiritual_need' => 'kekuatan baru',
            'intent' => 'butuh pemulihan',
            'verse_hints' => ['kekuatan', 'istirahat', 'dipulihkan', 'ditopang', 'dikuatkan'],
            'book_boost' => ['yes', 'mat', 'mzm', 'ibr'],
            'preferred_verse_tone' => 'restorative',
        ],
        'guilt' => [
            'keywords' => ['dosa', 'bersalah', 'malu', 'jatuh', 'gagal', 'ampun', 'menyesal', 'bertobat'],
            'emotion' => 'guilty',
            'emotional_need' => 'diterima kembali',
            'spiritual_need' => 'pengampunan dan pemulihan',
            'intent' => 'mencari pengampunan',
            'verse_hints' => ['ampuni', 'anugerah', 'kasih setia', 'belas kasihan', 'dipulihkan'],
            'book_boost' => ['1yoh', 'mzm', 'rom', 'luk'],
            'preferred_verse_tone' => 'restorative',
        ],
        'jealousy' => [
            'keywords' => ['iri', 'iri hati', 'cemburu', 'dengki'],
            'emotion' => 'resentful',
            'emotional_need' => 'hati yang dipulihkan dari perbandingan',
            'spiritual_need' => 'syukur dan ketulusan',
            'intent' => 'membebaskan hati dari iri',
            'verse_hints' => ['jangan iri', 'kasih', 'cukup', 'syukur'],
            'book_boost' => ['ams', 'yak', '1kor', 'mzm'],
            'preferred_verse_tone' => 'corrective',
        ],
        'grief' => [
            'keywords' => ['duka', 'berduka', 'kehilangan', 'menangis', 'berkabung'],
            'emotion' => 'sad',
            'emotional_need' => 'penghiburan',
            'spiritual_need' => 'pengharapan dalam kesedihan',
            'intent' => 'mencari penghiburan',
            'verse_hints' => ['air mata', 'penghiburan', 'dekat pada yang remuk', 'pengharapan'],
            'book_boost' => ['mzm', 'yes', 'yoh', '2kor'],
            'preferred_verse_tone' => 'comforting',
        ],
        'loneliness' => [
            'keywords' => ['sendiri', 'kesepian', 'sepi', 'tidak ada teman', 'merasa ditinggalkan'],
            'emotion' => 'sad',
            'emotional_need' => 'rasa ditemani',
            'spiritual_need' => 'kepastian penyertaan Tuhan',
            'intent' => 'mencari kehadiran',
            'verse_hints' => ['aku menyertai', 'jangan takut', 'tidak sendirian', 'dekat'],
            'book_boost' => ['mzm', 'yes', 'yoh', 'ibr'],
            'preferred_verse_tone' => 'comforting',
        ],
        'ministry_disillusionment' => [
            'keywords' => ['pelayanan', 'pendeta', 'gereja', 'tidak dilibatkan', 'dimanfaatkan', 'tidak sanggup bertahan', 'luka pelayanan'],
            'emotion' => 'resentful',
            'emotional_need' => 'didengar tanpa dihakimi',
            'spiritual_need' => 'pemulihan panggilan dan keteguhan hati',
            'intent' => 'mencari kejelasan panggilan dengan hati pulih',
            'verse_hints' => ['setia', 'hikmat', 'menguatkan', 'tidak tawar hati', 'gembalakan'],
            'book_boost' => ['2kor', 'gal', 'mzm', '1ptr', 'yak'],
            'preferred_verse_tone' => 'restorative',
        ],
        'church_hurt' => [
            'keywords' => ['luka gereja', 'tersakiti di gereja', 'kecewa gereja', 'trauma gereja', 'disakiti pemimpin'],
            'emotion' => 'sad',
            'emotional_need' => 'ruang aman untuk pulih',
            'spiritual_need' => 'penghiburan dan pemulihan kepercayaan',
            'intent' => 'dipulihkan tanpa menyangkal luka',
            'verse_hints' => ['dekat kepada yang patah hati', 'penghiburan', 'sabar', 'damai'],
            'book_boost' => ['mzm', 'mat', 'yoh', '2kor'],
            'preferred_verse_tone' => 'tender',
        ],
        'calling_conflict' => [
            'keywords' => ['panggilan', 'talenta', 'tidak dilibatkan', 'konflik pelayanan', 'arah hidup', 'tetap atau berhenti'],
            'emotion' => 'confused',
            'emotional_need' => 'kejelasan yang tenang',
            'spiritual_need' => 'hikmat dalam keputusan panggilan',
            'intent' => 'menimbang langkah dengan bijak',
            'verse_hints' => ['hikmat', 'tuntun', 'setia', 'jalan', 'teguh'],
            'book_boost' => ['ams', 'yak', 'mzm', 'kol'],
            'preferred_verse_tone' => 'guiding',
        ],
        'exploitation' => [
            'keywords' => ['dimanfaatkan', 'dieksploitasi', 'dipakai', 'kepentingan senior', 'hanya dipakai', 'tidak dihargai'],
            'emotion' => 'resentful',
            'emotional_need' => 'batas sehat dan martabat dipulihkan',
            'spiritual_need' => 'hikmat, keberanian, dan damai',
            'intent' => 'menetapkan batas yang benar',
            'verse_hints' => ['hikmat', 'lemah lembut', 'benar', 'damai', 'teguh'],
            'book_boost' => ['ams', 'yak', 'ef', 'rom'],
            'preferred_verse_tone' => 'corrective',
        ],
        'institutional_disappointment' => [
            'keywords' => ['institusi', 'organisasi', 'sistem', 'struktur', 'budaya kerja rohani', 'kecewa pimpinan'],
            'emotion' => 'resentful',
            'emotional_need' => 'diakui rasa kecewanya',
            'spiritual_need' => 'hikmat bersikap tanpa kepahitan',
            'intent' => 'mencari jalan yang sehat',
            'verse_hints' => ['hikmat', 'damai', 'sabar', 'kebenaran'],
            'book_boost' => ['ams', 'yak', 'mzm', 'rom'],
            'preferred_verse_tone' => 'guiding',
        ],
        'authority_wound' => [
            'keywords' => ['senior', 'otoritas', 'pemimpin', 'atasan rohani', 'ditekan pemimpin', 'disalahgunakan'],
            'emotion' => 'sad',
            'emotional_need' => 'rasa aman dan pemulihan harga diri',
            'spiritual_need' => 'kebenaran dengan kasih',
            'intent' => 'pulih sambil tetap bijak',
            'verse_hints' => ['kebenaran', 'lemah lembut', 'penghiburan', 'damai'],
            'book_boost' => ['mzm', 'ef', '1ptr', 'yak'],
            'preferred_verse_tone' => 'restorative',
        ],
        'mixed_emotional_state' => [
            'keywords' => ['di satu sisi', 'namun di sisi lain', 'campur aduk', 'bingung tapi', 'bersyukur tapi', 'rindu tapi'],
            'emotion' => 'confused',
            'emotional_need' => 'ditolong memilah isi hati',
            'spiritual_need' => 'damai dan kejelasan bertahap',
            'intent' => 'menata hati yang kompleks',
            'verse_hints' => ['damai', 'hikmat', 'menuntun', 'menopang'],
            'book_boost' => ['mzm', 'ams', 'flp', 'yak'],
            'preferred_verse_tone' => 'reassuring',
        ],
        'direction' => [
            'keywords' => ['bingung', 'keputusan', 'jalan', 'masa depan', 'pilihan', 'rencana', 'arah', 'langkah'],
            'emotion' => 'confused',
            'emotional_need' => 'kejelasan',
            'spiritual_need' => 'hikmat dan tuntunan',
            'intent' => 'mencari arah',
            'verse_hints' => ['hikmat', 'tuntun', 'jalan', 'percaya', 'nasihat'],
            'book_boost' => ['ams', 'mzm', 'yes', 'yak'],
            'preferred_verse_tone' => 'guiding',
        ],
        'repentance' => [
            'keywords' => ['bertobat', 'mengaku', 'meninggalkan dosa', 'ubah hidup'],
            'emotion' => 'guilty',
            'emotional_need' => 'diterima kembali',
            'spiritual_need' => 'pertobatan yang memulihkan',
            'intent' => 'mengaku dan berbalik',
            'verse_hints' => ['bertobat', 'ampuni', 'belas kasihan', 'dipulihkan'],
            'book_boost' => ['1yoh', 'mzm', 'luk', 'kis'],
            'preferred_verse_tone' => 'restorative',
        ],
        'hope' => [
            'keywords' => ['harap', 'pengharapan', 'masa depan', 'percaya Tuhan'],
            'emotion' => 'hopeful',
            'emotional_need' => 'keteguhan iman',
            'spiritual_need' => 'pengharapan yang bertahan',
            'intent' => 'menguatkan hati',
            'verse_hints' => ['pengharapan', 'setia', 'janji', 'menopang'],
            'book_boost' => ['rom', 'ibr', 'yer', 'mzm'],
            'preferred_verse_tone' => 'reassuring',
        ],
        'surrender' => [
            'keywords' => ['serahkan', 'pasrah', 'berserah', 'kehendakmu', 'menyerah kepada tuhan'],
            'emotion' => 'hopeful',
            'emotional_need' => 'hati yang tenang',
            'spiritual_need' => 'iman untuk berserah',
            'intent' => 'menyerahkan keadaan kepada Tuhan',
            'verse_hints' => ['serahkan', 'percaya', 'menopang', 'setia', 'damai'],
            'book_boost' => ['mzm', 'ams', 'mat', 'flp'],
            'preferred_verse_tone' => 'guiding',
        ],
    ];

    private const EMOTION_PROFILES = [
        'positive' => ['syukur', 'bersyukur', 'bahagia', 'sukacita', 'lega', 'damai', 'senang'],
        'tender' => ['rindu', 'kangen', 'merindukan', 'jauh', 'terpisah', 'menanti'],
        'fearful' => ['cemas', 'khawatir', 'takut', 'gelisah', 'panik', 'resah'],
        'exhausted' => ['lelah', 'letih', 'capek', 'penat', 'burnout', 'jenuh'],
        'guilty' => ['bersalah', 'dosa', 'ampun', 'menyesal', 'malu', 'bertobat'],
        'confused' => ['bingung', 'ragu', 'keputusan', 'arah', 'pilihan', 'jalan'],
        'angry' => ['marah', 'kesal', 'emosi', 'jengkel', 'muak'],
        'resentful' => ['iri', 'dengki', 'cemburu', 'kesel sama'],
        'hostile' => ['benci', 'dendam', 'maki', 'hancurin', 'balas'],
        'sad' => ['sedih', 'duka', 'kehilangan', 'kesepian', 'sendiri'],
        'hopeful' => ['harap', 'pengharapan', 'percaya', 'berserah'],
    ];

    private const INTENT_PROFILES = [
        'express_gratitude' => ['bersyukur', 'memuji', 'puji', 'terima kasih'],
        'seek_comfort' => ['rindu', 'sendiri', 'kesepian', 'jauh', 'terpisah', 'cemas', 'takut', 'duka'],
        'confess' => ['ampun', 'dipulihkan', 'bertobat', 'mengaku dosa'],
        'lament' => ['mengeluh', 'duka', 'sedih', 'kehilangan'],
        'process_anger' => ['marah', 'kesal', 'emosi', 'benci', 'dendam'],
        'seek_reconciliation' => ['rekonsiliasi', 'memperbaiki', 'berdamai'],
        'seek_release' => ['lepaskan', 'bebas', 'tenang', 'ampuni'],
        'seek_peace' => ['damai', 'tenang', 'teduh'],
        'guidance' => ['bingung', 'keputusan', 'arah', 'langkah', 'rencana', 'masa depan'],
        'surrender_burden' => ['serahkan', 'pasrah', 'berserah', 'kehendakmu'],
    ];

    private const STOP_WORDS = [
        'yang', 'dengan', 'untuk', 'dalam', 'sudah', 'akan', 'saya', 'kami', 'kamu', 'dari', 'karena', 'tetapi',
        'atau', 'dan', 'itu', 'ini', 'hari', 'lagi', 'saat', 'agar', 'pada', 'kepada', 'seperti',
    ];

    public function personalize(Request $request): JsonResponse
    {
        $requestStartedAt = microtime(true);
        $this->usedFallbackContent = false;
        $requestContext = $this->requestMapper->map($request);
        $requestId = $requestContext['request_id'];
        $debugForceMode = $requestContext['debug_force_mode'];
        $reflectionText = $requestContext['reflection_text'];
        $lang = $requestContext['lang'];
        $responseMode = $requestContext['response_mode'];
        $entryState = is_string($requestContext['entry_state'] ?? null) ? (string) $requestContext['entry_state'] : null;
        $storageMode = $requestContext['storage_mode'];

        $analysisStartedAt = microtime(true);
        $analysis = $this->analyzeReflection($reflectionText, $entryState);
        $analysisDurationMs = $this->elapsedMs($analysisStartedAt);
        $searchTerms = $this->searchTermBuilder->build(
            $reflectionText,
            $analysis,
            self::THEME_PROFILES,
            self::STOP_WORDS
        );

        $verseQueryStartedAt = microtime(true);
        $candidates = $this->queryVerseCandidates($lang, $searchTerms);
        $verseQueryDurationMs = $this->elapsedMs($verseQueryStartedAt);

        $verseSelectionStartedAt = microtime(true);
        $selected = $this->selectCorrelatedVerses($candidates, $searchTerms, $analysis, $reflectionText);
        $verseSelectionDurationMs = $this->elapsedMs($verseSelectionStartedAt);
        $fallbackVerseUsed = false;

        if (empty($selected)) {
            $fallback = BibleVerse::query()
                ->select(['id', 'reference', 'text', 'book_code', 'chapter', 'verse'])
                ->where('provider', 'ayt')
                ->where('lang', $lang)
                ->where('book_code', 'mzm')
                ->where('chapter', 55)
                ->where('verse', 23)
                ->first();
            if ($fallback) {
                $selected = [$fallback];
                $fallbackVerseUsed = true;
            }
        }
        $selectedVerseCount = count($selected);

        $primary = $selected[0] ?? null;
        $interpretationStartedAt = microtime(true);
        $interpretation = $this->pastoralInterpretationService->buildInterpretation($selected, $analysis, $reflectionText, $lang);
        if (! is_array($interpretation) || empty($interpretation['verse_main_message'])) {
            $interpretation = $this->buildPastoralInterpretationContext($primary, $analysis, $reflectionText);
        }
        $interpretationDurationMs = $this->elapsedMs($interpretationStartedAt);

        $generationStartedAt = microtime(true);
        $generationPlan = $this->buildGenerationPlan($reflectionText, $analysis, $interpretation);
        $meditation = $this->composeMeditation(
            $reflectionText,
            $analysis,
            $interpretation,
            (string) ($primary?->text ?? ''),
            $generationPlan
        );
        $generationDurationMs = $this->elapsedMs($generationStartedAt);
        $evaluationStartedAt = microtime(true);
        $qualityResolution = $this->qualityOrchestrator->resolve(
            $meditation,
            $debugForceMode,
            fn (string $text): array => $this->evaluateMeditationQuality($text, $reflectionText, $analysis, $generationPlan),
            fn (): string => $this->rewriteMeditationFromPlan($reflectionText, $analysis, $interpretation, $generationPlan),
            fn (): string => $this->composeSafeFallbackMeditation($analysis),
        );
        $meditation = $qualityResolution['meditation'];
        $initialQuality = $qualityResolution['initial_quality'];
        $quality = $qualityResolution['quality'];
        $rewriteCount = $qualityResolution['rewrite_count'];
        $this->usedFallbackContent = $qualityResolution['used_fallback_content'];
        $evaluationDurationMs = $this->elapsedMs($evaluationStartedAt);

        $responsePayload = $this->payloadAssembler->buildInitialPayload(
            $meditation,
            $selected,
            $primary,
            $analysis,
            $interpretation,
            $generationPlan,
            $quality
        );

        $mentorStartedAt = microtime(true);
        $mentorResult = $this->renunganAIService->generate([
            'reflection_text' => $reflectionText,
            'legacy_meditation' => $meditation,
            'verse_reference' => (string) ($primary?->reference ?? 'Mazmur 55:23'),
            'verse_text' => (string) ($primary?->text ?? ''),
            'analysis' => $analysis,
            'interpretation' => $interpretation,
            'generation_plan' => $generationPlan,
            'quality' => $quality,
            'response_mode' => $responseMode,
            'entry_state' => $entryState,
            'storage_mode' => $storageMode,
        ]);
        $mentorDurationMs = $this->elapsedMs($mentorStartedAt);

        $responsePayload = $this->payloadAssembler->withMentorResult(
            $responsePayload,
            $mentorResult,
            $meditation,
            $requestId,
            $responseMode
        );

        $requestDurationMs = $this->elapsedMs($requestStartedAt);
        $telemetryContext = $this->telemetryBuilder->build([
            'request_id' => $requestId,
            'pipeline_version' => self::PIPELINE_VERSION,
            'debug_force_mode' => $debugForceMode,
            'reflection_text' => $reflectionText,
            'analysis' => $analysis,
            'entry_state' => $entryState,
            'initial_quality' => $initialQuality,
            'quality' => $quality,
            'mentor_result' => $mentorResult,
            'analysis_duration_ms' => $analysisDurationMs,
            'verse_query_duration_ms' => $verseQueryDurationMs,
            'verse_selection_duration_ms' => $verseSelectionDurationMs,
            'interpretation_duration_ms' => $interpretationDurationMs,
            'generation_duration_ms' => $generationDurationMs,
            'evaluation_duration_ms' => $evaluationDurationMs,
            'mentor_duration_ms' => $mentorDurationMs,
            'total_duration_ms' => $requestDurationMs,
            'candidate_count' => $candidates->count(),
            'selected_verse_count' => $selectedVerseCount,
            'fallback_verse_used' => $fallbackVerseUsed,
            'used_fallback_content' => $this->usedFallbackContent,
            'rewrite_count' => $rewriteCount,
            'verse_reference' => (string) ($primary?->reference ?? ''),
        ]);
        $responsePayload = $this->responseFinalizer->finalize(
            $request,
            $analysis,
            $responsePayload,
            $telemetryContext,
            (bool) $requestContext['include_debug_telemetry'],
            self::PIPELINE_VERSION
        );

        return response()
            ->json($responsePayload)
            ->header('x-renungan-request-id', $requestId)
            ->header('x-renungan-pipeline-version', self::PIPELINE_VERSION);
    }

    private function analyzeReflection(string $text, ?string $entryState = null): array
    {
        $normalized = $this->normalizeText($text);
        $themeScores = $this->scoreProfiles($normalized, self::THEME_PROFILES);
        $emotionScores = $this->scoreProfiles($normalized, self::EMOTION_PROFILES);
        $intentScores = $this->scoreProfiles($normalized, self::INTENT_PROFILES);
        $contextFlags = $this->detectContextFlags($normalized);

        if ($contextFlags['has_family_terms'] && $contextFlags['has_longing_terms']) {
            $themeScores['longing_family'] = ($themeScores['longing_family'] ?? 0) + 3.5;
            $intentScores['seek_comfort'] = ($intentScores['seek_comfort'] ?? 0) + 2.0;
        }
        if ($contextFlags['has_conflict_terms']) {
            $themeScores['relationship_conflict'] = ($themeScores['relationship_conflict'] ?? 0) + 3.0;
            $intentScores['seek_reconciliation'] = ($intentScores['seek_reconciliation'] ?? 0) + 1.5;
        }
        if ($contextFlags['has_gratitude_terms']) {
            $themeScores['gratitude'] = ($themeScores['gratitude'] ?? 0) + 2.5;
            $intentScores['express_gratitude'] = ($intentScores['express_gratitude'] ?? 0) + 1.5;
        }
        if ($contextFlags['has_anger_terms']) {
            $themeScores['anger_conflict'] = ($themeScores['anger_conflict'] ?? 0) + 2.8;
            $intentScores['process_anger'] = ($intentScores['process_anger'] ?? 0) + 2.2;
        }
        if ($contextFlags['has_harm_terms']) {
            $themeScores['hatred_hostility'] = ($themeScores['hatred_hostility'] ?? 0) + 3.4;
            $intentScores['seek_release'] = ($intentScores['seek_release'] ?? 0) + 1.8;
        }
        if ($contextFlags['has_guilt_terms']) {
            $themeScores['guilt'] = ($themeScores['guilt'] ?? 0) + 2.4;
            $intentScores['confess'] = ($intentScores['confess'] ?? 0) + 1.6;
        }
        if ($contextFlags['has_fear_terms']) {
            $themeScores['anxiety'] = ($themeScores['anxiety'] ?? 0) + 2.3;
            $intentScores['seek_peace'] = ($intentScores['seek_peace'] ?? 0) + 1.2;
        }
        if ($contextFlags['has_exhaustion_terms']) {
            $themeScores['fatigue'] = ($themeScores['fatigue'] ?? 0) + 2.3;
            $intentScores['seek_comfort'] = ($intentScores['seek_comfort'] ?? 0) + 1.2;
        }
        if ($contextFlags['has_ministry_terms']) {
            $themeScores['ministry_disillusionment'] = ($themeScores['ministry_disillusionment'] ?? 0) + 2.8;
        }
        if ($contextFlags['has_church_hurt_terms']) {
            $themeScores['church_hurt'] = ($themeScores['church_hurt'] ?? 0) + 2.8;
        }
        if ($contextFlags['has_calling_terms']) {
            $themeScores['calling_conflict'] = ($themeScores['calling_conflict'] ?? 0) + 2.2;
        }
        if ($contextFlags['has_exploitation_terms']) {
            $themeScores['exploitation'] = ($themeScores['exploitation'] ?? 0) + 2.6;
        }
        if ($contextFlags['has_institution_terms']) {
            $themeScores['institutional_disappointment'] = ($themeScores['institutional_disappointment'] ?? 0) + 2.2;
        }
        if ($contextFlags['has_authority_wound_terms']) {
            $themeScores['authority_wound'] = ($themeScores['authority_wound'] ?? 0) + 2.4;
        }
        $negativeSignalCount = 0;
        foreach (['has_conflict_terms', 'has_anger_terms', 'has_harm_terms', 'has_church_hurt_terms', 'has_exploitation_terms', 'has_authority_wound_terms', 'has_fear_terms', 'has_exhaustion_terms'] as $flagKey) {
            if ($contextFlags[$flagKey] ?? false) {
                $negativeSignalCount++;
            }
        }
        if ($negativeSignalCount >= 3) {
            $themeScores['mixed_emotional_state'] = ($themeScores['mixed_emotional_state'] ?? 0) + 2.9;
            $intentScores['seek_peace'] = ($intentScores['seek_peace'] ?? 0) + 1.4;
        }

        $entryProfile = is_string($entryState) ? (self::ENTRY_STATE_PROFILE[$entryState] ?? null) : null;
        if (is_array($entryProfile)) {
            $themeKey = (string) ($entryProfile['theme'] ?? '');
            $emotionKey = (string) ($entryProfile['emotion'] ?? '');
            $intentKey = (string) ($entryProfile['intent'] ?? '');

            if ($themeKey !== '') {
                $themeScores[$themeKey] = ($themeScores[$themeKey] ?? 0) + 2.8;
            }
            if ($emotionKey !== '') {
                $emotionScores[$emotionKey] = ($emotionScores[$emotionKey] ?? 0) + 2.4;
            }
            if ($intentKey !== '') {
                $intentScores[$intentKey] = ($intentScores[$intentKey] ?? 0) + 2.0;
            }
        }

        arsort($themeScores, SORT_NUMERIC);
        arsort($emotionScores, SORT_NUMERIC);
        arsort($intentScores, SORT_NUMERIC);

        $primaryTheme = (string) (array_key_first($themeScores) ?? 'direction');
        $primaryEmotion = (string) (array_key_first($emotionScores) ?? (self::THEME_PROFILES[$primaryTheme]['emotion'] ?? 'confused'));
        $intent = $this->resolveIntent($intentScores, $primaryTheme, $normalized);
        $tone = $this->inferTone($primaryEmotion, $contextFlags);
        $intensity = $this->computeIntensity($text, $themeScores, $emotionScores);
        $profile = self::THEME_PROFILES[$primaryTheme] ?? self::THEME_PROFILES['direction'];

        $secondaryThemes = collect(array_keys($themeScores))
            ->reject(fn (string $theme) => $theme === $primaryTheme)
            ->take(2)
            ->values()
            ->all();

        $secondaryEmotions = collect(array_keys($emotionScores))
            ->reject(fn (string $emotion) => $emotion === $primaryEmotion)
            ->take(2)
            ->values()
            ->all();

        return [
            'primary_theme' => $primaryTheme,
            'secondary_themes' => $secondaryThemes,
            'primary_emotion' => $primaryEmotion,
            'secondary_emotions' => $secondaryEmotions,
            'intent' => $intent,
            'tone' => $tone,
            'intensity' => $intensity,
            'relational_context' => $this->resolveRelationalContext($contextFlags),
            'emotional_need' => (string) ($profile['emotional_need'] ?? 'ketenangan'),
            'spiritual_need' => (string) ($profile['spiritual_need'] ?? 'pengharapan'),
            'preferred_verse_tone' => (string) ($profile['preferred_verse_tone'] ?? 'comforting'),
            'context_flags' => $contextFlags,
            'theme_scores' => $this->roundScores($themeScores),
            'emotion_scores' => $this->roundScores($emotionScores),
            'entry_state' => $entryState,
        ];
    }

    private function queryVerseCandidates(string $lang, array $searchTerms)
    {
        if (empty($searchTerms)) {
            return collect();
        }

        $candidateLimit = (int) config('renungan.performance.verse_candidate_limit', self::VERSE_CANDIDATE_LIMIT);
        $candidateLimit = max(40, min(280, $candidateLimit));

        return BibleVerse::query()
            ->select(['id', 'reference', 'text', 'book_code', 'chapter', 'verse'])
            ->where('provider', 'ayt')
            ->where('lang', $lang)
            ->where(function ($query) use ($searchTerms): void {
                foreach ($searchTerms as $term) {
                    $query->orWhere('text', 'like', '%'.$term.'%')
                        ->orWhere('reference', 'like', '%'.$term.'%');
                }
            })
            ->orderBy('id')
            ->limit($candidateLimit)
            ->get();
    }

    private function selectCorrelatedVerses($candidates, array $searchTerms, array $analysis, string $reflectionText): array
    {
        if ($candidates->isEmpty()) {
            return [];
        }

        $normalizedTerms = collect($searchTerms)
            ->map(fn (string $term) => Str::lower($term))
            ->filter()
            ->values()
            ->all();

        $primaryTheme = (string) ($analysis['primary_theme'] ?? 'direction');
        $bookBoost = self::THEME_PROFILES[$primaryTheme]['book_boost'] ?? ['mzm', 'mat', 'yoh'];
        $preferredTone = (string) ($analysis['preferred_verse_tone'] ?? 'comforting');
        $contextFlags = (array) ($analysis['context_flags'] ?? []);
        $reflectionNormalized = $this->normalizeText($reflectionText);

        $scored = $candidates
            ->map(function (BibleVerse $verse) use ($normalizedTerms, $analysis, $bookBoost, $preferredTone, $contextFlags, $reflectionNormalized) {
                $verseText = Str::lower((string) $verse->text);
                $score = 0.0;

                foreach ($normalizedTerms as $term) {
                    if (Str::contains($verseText, $term)) {
                        $score += strlen($term) > 5 ? 8.5 : 5.5;
                    }
                }

                $themeHints = self::THEME_PROFILES[(string) ($analysis['primary_theme'] ?? 'direction')]['verse_hints'] ?? [];
                foreach ($themeHints as $hint) {
                    if (Str::contains($verseText, Str::lower($hint))) {
                        $score += 7.0;
                    }
                }

                if (in_array((string) $verse->book_code, $bookBoost, true)) {
                    $score += 8.0;
                }

                $verseTone = $this->classifyVerseTone($verseText);
                if ($verseTone === $preferredTone) {
                    $score += 9.5;
                } elseif ($preferredTone === 'comforting' && $verseTone === 'restorative') {
                    $score += 4.0;
                } elseif ($verseTone === 'corrective' && $preferredTone !== 'corrective') {
                    $score -= 7.5;
                }

                if (($contextFlags['has_family_terms'] ?? false) && ($contextFlags['has_longing_terms'] ?? false)) {
                    if (Str::contains($verseText, 'menyertai') || Str::contains($verseText, 'pelihara') || Str::contains($verseText, 'lindungi')) {
                        $score += 10.0;
                    }
                    if (Str::contains($verseText, 'bertengkar') || Str::contains($verseText, 'perselisihan')) {
                        $score -= 8.0;
                    }
                }

                if (($contextFlags['has_conflict_terms'] ?? false) && (Str::contains($verseText, 'mengampuni') || Str::contains($verseText, 'damai'))) {
                    $score += 7.0;
                }
                if (
                    ($contextFlags['has_ministry_terms'] ?? false)
                    || ($contextFlags['has_church_hurt_terms'] ?? false)
                    || ($contextFlags['has_exploitation_terms'] ?? false)
                    || ($contextFlags['has_authority_wound_terms'] ?? false)
                ) {
                    if (
                        Str::contains($verseText, 'hikmat')
                        || Str::contains($verseText, 'damai')
                        || Str::contains($verseText, 'jangan tawar hati')
                        || Str::contains($verseText, 'menguatkan')
                        || Str::contains($verseText, 'setia')
                    ) {
                        $score += 9.0;
                    }
                    if (Str::contains($verseText, 'sukacita') && !Str::contains($reflectionNormalized, 'syukur')) {
                        $score -= 4.0;
                    }
                }
                if (($contextFlags['has_anger_terms'] ?? false) || ($contextFlags['has_harm_terms'] ?? false)) {
                    if (
                        Str::contains($verseText, 'lambat untuk marah')
                        || Str::contains($verseText, 'jangan membalas')
                        || Str::contains($verseText, 'perkataan')
                        || Str::contains($verseText, 'lemah lembut')
                        || Str::contains($verseText, 'damai')
                    ) {
                        $score += 10.5;
                    }
                    if (Str::contains($verseText, 'sukacita') || Str::contains($verseText, 'bersyukurlah')) {
                        $score -= 6.0;
                    }
                }

                if (Str::contains($reflectionNormalized, 'berkat') && Str::contains($verseText, 'berkat')) {
                    $score += 6.0;
                }

                return [
                    'verse' => $verse,
                    'score' => $score,
                ];
            })
            ->sortByDesc('score')
            ->values();

        if ($scored->isEmpty()) {
            return [];
        }

        /** @var BibleVerse $primary */
        $primary = $scored[0]['verse'];
        $selected = [$primary];

        $supporting = $scored
            ->skip(1)
            ->map(fn (array $item) => $item['verse'])
            ->unique(fn (BibleVerse $verse) => (string) $verse->reference)
            ->reject(fn (BibleVerse $verse) => (int) $verse->id === (int) $primary->id)
            ->take(2)
            ->values()
            ->all();

        foreach ($supporting as $verse) {
            $selected[] = $verse;
        }

        return array_values($selected);
    }

    private function composeMeditation(
        string $reflectionText,
        array $analysis,
        array $interpretation,
        string $primaryVerseText,
        array $generationPlan = []
    ): string
    {
        $primaryTheme = (string) ($analysis['primary_theme'] ?? 'direction');
        $primaryEmotion = (string) ($analysis['primary_emotion'] ?? 'confused');
        $intent = (string) ($analysis['intent'] ?? 'guidance');
        $relationalContext = (string) ($analysis['relational_context'] ?? 'neutral');
        $emotionalNeed = (string) ($analysis['emotional_need'] ?? 'ketenangan');
        $spiritualNeed = (string) ($analysis['spiritual_need'] ?? 'pengharapan');
        $reflectionEcho = $this->extractReflectionEcho($reflectionText, $primaryTheme, $generationPlan);

        $openingDefault = match ($primaryTheme) {
            'gratitude' => "Syukurmu hari ini adalah respons iman yang indah.",
            'longing_family' => "Kerinduanmu kepada orang yang kamu kasihi adalah ungkapan kasih yang tulus, dan Tuhan memahaminya sepenuhnya.",
            'relationship_conflict' => "Tuhan melihat luka relasimu dengan kasih yang tidak menghakimi.",
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound' => "Tuhan melihat pergumulanmu dalam pelayanan dan relasi dengan sangat jujur, tanpa mengabaikan luka yang kamu rasakan.",
            'mixed_emotional_state' => "Tuhan memahami isi hatimu yang campur aduk, dan Ia tidak menuntutmu menyederhanakan rasa yang memang kompleks.",
            'anger_conflict', 'hatred_hostility' => "Tuhan melihat kemarahanmu dengan jujur, dan Ia menuntunmu agar emosi itu tidak melukai dirimu maupun orang lain.",
            'anxiety' => "Tuhan hadir menenangkan hatimu di tengah rasa cemas.",
            'fatigue' => "Dalam lelahmu, Tuhan tidak menekanmu; Ia meneduhkan dan menguatkanmu.",
            'guilt', 'repentance' => "Kasih Tuhan membukakan jalan pulih, bahkan ketika kamu merasa gagal.",
            'grief', 'loneliness' => "Tuhan dekat ketika hatimu sedih dan merasa sendirian.",
            'surrender' => "Keinginanmu untuk berserah adalah langkah iman yang dewasa.",
            default => "Tuhan menuntunmu dengan lembut ketika arah terasa belum jelas.",
        };

        $bodyDefault = match ($primaryTheme) {
            'gratitude' => "Rawatlah hati yang bersyukur itu agar tetap berakar pada kebaikan-Nya, bukan pada situasi yang berubah.",
            'longing_family' => "Di tengah jarak atau perpisahan, kamu boleh mempercayakan mereka ke dalam penjagaan-Nya sambil terus mendoakan perlindungan dan damai.",
            'relationship_conflict' => "Mintalah hati yang lembut untuk berkata benar dalam kasih, sehingga pemulihan terjadi tanpa kehilangan ketegasan.",
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound' => "Sebelum mengambil keputusan besar, izinkan Tuhan memulihkan hatimu lebih dulu, menolongmu menetapkan batas yang sehat, dan memberi hikmat untuk melangkah benar tanpa kepahitan.",
            'mixed_emotional_state' => "Kamu boleh menata satu per satu isi hati ini dalam doa, karena damai Tuhan sering hadir lewat langkah kecil yang jujur, bukan lewat jawaban instan.",
            'anger_conflict', 'hatred_hostility' => "Sebelum bereaksi, ambil jeda, tenangkan napas, lalu pilih kata yang benar dan tidak melukai; di situlah kedewasaan rohani sedang dibentuk.",
            'anxiety' => "Tarik napas perlahan, serahkan hal yang di luar kendalimu, lalu melangkah dengan damai yang Tuhan berikan.",
            'fatigue' => "Kamu boleh beristirahat tanpa rasa bersalah, sebab Tuhan sanggup menambah kekuatanmu setahap demi setahap.",
            'guilt', 'repentance' => "Pengakuan yang jujur bukan akhir, melainkan pintu masuk untuk pengampunan, pemulihan, dan hidup baru.",
            'grief', 'loneliness' => "Di ruang sepi itu, Tuhan tetap bekerja lembut, meneguhkanmu sedikit demi sedikit dengan penghiburan-Nya.",
            'surrender' => "Saat kamu menyerahkan keadaanmu kepada Tuhan, Ia membentuk keteguhan yang tenang dari dalam.",
            default => "Setialah pada langkah kecil hari ini, karena Tuhan sering menyingkapkan arah melalui ketaatan yang sederhana.",
        };

        $closingDefault = match (true) {
            $relationalContext === 'longing' => "Tuhan tetap menyertaimu hari ini dan menumbuhkan pengharapan untuk perjumpaan pada waktu-Nya.",
            in_array($primaryTheme, ['ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state'], true) => "Tuhan menuntunmu memilih jalan yang benar: tetap lembut, tetap jujur, dan tetap sehat secara rohani.",
            $intent === 'express_gratitude' => "Biarlah penyembahanmu hari ini membuat hatimu makin peka terhadap kemurahan Tuhan.",
            in_array($primaryTheme, ['anger_conflict', 'hatred_hostility'], true) => "Pilihanmu untuk menahan diri hari ini adalah langkah kemenangan yang berkenan di hadapan Tuhan.",
            $primaryEmotion === 'guilty' => "Kasih karunia-Nya lebih besar daripada rasa bersalahmu, dan masa depanmu tidak berhenti di kegagalan.",
            default => "Hari ini kamu membutuhkan {$emotionalNeed}, dan Tuhan menuntunmu kepada {$spiritualNeed}.",
        };
        $opening = (string) ($generationPlan['outline']['opening'] ?? $openingDefault);
        $body = (string) ($generationPlan['outline']['body'] ?? $bodyDefault);
        $closing = (string) ($generationPlan['outline']['closing'] ?? $closingDefault);

        $pastoralInsight = (string) ($interpretation['pastoral_application'] ?? 'Firman Tuhan menuntunmu melihat keadaan ini dengan iman yang tenang.');
        $hopeDirection = (string) ($interpretation['hope_direction'] ?? '');
        $prayerDirection = (string) ($interpretation['prayer_direction'] ?? '');
        $pastoralAngle = (string) ($generationPlan['pastoral_angle'] ?? '');

        $deEscalationDirection = (string) ($interpretation['de_escalation_direction'] ?? '');
        $correctionDirection = (string) ($interpretation['correction_direction'] ?? '');

        $raw = trim($opening.' '.$reflectionEcho.' '.$body.' '.$pastoralAngle.' '.$pastoralInsight.' '.$closing.' '.$deEscalationDirection.' '.$correctionDirection.' '.$hopeDirection.' '.$prayerDirection);
        $finalized = $this->finalizeMeditationText($raw, $analysis);

        return $this->ensurePastoralOriginality($finalized, $primaryVerseText, $analysis, $interpretation);
    }

    private function buildGenerationPlan(string $reflectionText, array $analysis, array $interpretation): array
    {
        $primaryTheme = (string) ($analysis['primary_theme'] ?? 'direction');
        $intent = (string) ($analysis['intent'] ?? 'guidance');
        $emotionalNeed = (string) ($analysis['emotional_need'] ?? 'ketenangan');
        $spiritualNeed = (string) ($analysis['spiritual_need'] ?? 'pengharapan');
        $anchor = $this->extractReflectionAnchor($reflectionText);

        $intentSummary = match ($intent) {
            'express_gratitude' => 'Pengguna sedang datang dengan hati syukur dan ingin menjaga ketulusan itu.',
            'seek_comfort' => 'Pengguna mencari penghiburan yang tenang di tengah beban emosional.',
            'confess' => 'Pengguna sedang membawa pengakuan dan merindukan pemulihan yang nyata.',
            'process_anger' => 'Pengguna sedang bergumul dengan emosi panas dan butuh arah yang meneduhkan.',
            'seek_reconciliation' => 'Pengguna ingin memulihkan relasi tanpa kehilangan kejujuran.',
            'seek_release' => 'Pengguna ingin melepas beban batin yang menekan.',
            'seek_peace' => 'Pengguna merindukan damai batin dan kejernihan langkah.',
            'surrender_burden' => 'Pengguna sedang belajar berserah sambil menata langkah konkret.',
            default => 'Pengguna mencari tuntunan rohani yang jelas untuk kondisi saat ini.',
        };

        $heartDiagnosis = match ($primaryTheme) {
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound' => 'Ada luka relasional dan rasa tidak aman yang perlu diakui dulu sebelum diarahkan.',
            'anger_conflict', 'hatred_hostility' => 'Ada dorongan reaktif yang perlu ditenangkan agar tidak melahirkan luka baru.',
            'anxiety' => 'Ada kegelisahan yang butuh ruang aman, bukan tuntutan untuk langsung kuat.',
            'fatigue' => 'Ada kelelahan nyata; pemulihan ritme perlu disebutkan secara konkret.',
            'guilt', 'repentance' => 'Ada rasa bersalah yang perlu diarahkan ke pertobatan yang memulihkan, bukan rasa malu berkepanjangan.',
            default => 'Isi hati perlu ditata agar '.$emotionalNeed.' membuka jalan menuju '.$spiritualNeed.'.',
        };

        $pastoralAngle = (string) ($interpretation['verse_main_message'] ?? $interpretation['pastoral_application'] ?? 'Tuhan menuntun hati dengan kebenaran yang lembut.');
        $themeGuidance = (string) ($interpretation['pastoral_application'] ?? 'Jalani langkah kecil yang jujur bersama Tuhan.');
        $hopeDirection = (string) ($interpretation['hope_direction'] ?? 'Pengharapan tetap mungkin bertumbuh saat kamu melangkah setia.');

        return [
            'intent_summary' => $intentSummary,
            'heart_diagnosis' => $heartDiagnosis,
            'pastoral_angle' => $pastoralAngle,
            'anchor' => $anchor,
            'outline' => [
                'opening' => trim('Saat kamu menulis tentang '.$anchor.', Tuhan melihat itu dengan jujur tanpa menghakimi.'),
                'body' => trim($themeGuidance.' '.$heartDiagnosis.' Mulailah dari satu langkah yang bisa kamu jalani hari ini.'),
                'closing' => trim($hopeDirection.' Tutup hari ini dengan doa sederhana yang selaras dengan isi hatimu.'),
            ],
        ];
    }

    private function extractReflectionEcho(string $reflectionText, string $primaryTheme, array $generationPlan = []): string
    {
        $clean = trim((string) Str::of($reflectionText)->replaceMatches('/\s+/', ' '));
        $anchor = (string) ($generationPlan['anchor'] ?? '');
        if ($clean === '' || strlen($clean) > 180) {
            return match ($primaryTheme) {
                'longing_family' => "Kerinduan itu tidak membuatmu lemah; kerinduan itu menunjukkan kasih yang hidup.",
                'anxiety' => "Kamu tidak perlu pura-pura kuat ketika hatimu sedang mencari ketenangan.",
                default => $anchor !== '' ? 'Inti isi hatimu tentang '.$anchor.' sungguh didengar oleh Tuhan.' : "Tuhan menghargai kejujuran hatimu di hadapan-Nya.",
            };
        }

        $safe = preg_replace('/[\"\']+/', '', $clean) ?? $clean;

        return 'Saat kamu membawa isi hati ini dalam doa: '.$safe.'.';
    }

    private function finalizeMeditationText(string $meditation, array $analysis): string
    {
        $normalized = (string) Str::of($meditation)
            ->replaceMatches('/\s+/', ' ')
            ->replaceMatches('/\s+([,.;!?])/', '$1')
            ->trim();

        $normalized = preg_replace('/([!?.,;:]){2,}/', '$1', $normalized) ?? $normalized;
        $normalized = str_replace(['…', '...'], '.', $normalized);
        $normalized = preg_replace('/\s*"\s*/', '', $normalized) ?? $normalized;
        $normalized = trim($normalized);

        if ($normalized === '' || strlen($normalized) < 80) {
            $this->usedFallbackContent = true;
            return $this->composeSafeFallbackMeditation($analysis);
        }

        if (!preg_match('/[.!?]$/', $normalized)) {
            $normalized .= '.';
        }

        if (preg_match('/\b(dan|atau|karena|sehingga)\.?$/i', $normalized) || preg_match('/[,;:]$/', $normalized)) {
            $normalized .= ' Tuhan tetap menyertaimu dengan setia.';
        }

        return $normalized;
    }

    private function rewriteMeditationFromPlan(string $reflectionText, array $analysis, array $interpretation, array $generationPlan): string
    {
        $opening = (string) ($generationPlan['outline']['opening'] ?? 'Tuhan melihat isi hatimu dengan jujur dan penuh kasih.');
        $body = (string) ($generationPlan['outline']['body'] ?? 'Langkah kecil yang setia akan menolongmu berjalan lebih jernih hari ini.');
        $closing = (string) ($generationPlan['outline']['closing'] ?? 'Tuhan tetap memegang prosesmu dan menuntunmu dengan damai.');
        $prayerDirection = (string) ($interpretation['prayer_direction'] ?? 'Doakan ini dengan singkat dan jujur di hadapan Tuhan.');
        $anchor = $this->extractReflectionAnchor($reflectionText);

        $raw = trim($opening.' Saat kamu berkata tentang '.$anchor.', kamu sedang membawa hal yang nyata kepada Tuhan. '.$body.' '.$closing.' '.$prayerDirection);

        return $this->finalizeMeditationText($raw, $analysis);
    }

    private function evaluateMeditationQuality(string $meditation, string $reflectionText, array $analysis, array $generationPlan): array
    {
        $normalizedMeditation = $this->normalizeText($meditation);
        if ($normalizedMeditation === '') {
            return ['passed' => false, 'reasons' => ['empty_meditation']];
        }

        $reasons = [];
        $sentences = preg_split('/[.!?]+/', trim($meditation)) ?: [];
        $sentenceCount = count(array_values(array_filter($sentences, fn ($sentence) => trim((string) $sentence) !== '')));
        if (strlen($meditation) < 140 || $sentenceCount < 4) {
            $reasons[] = 'too_short_or_fragmented';
        }

        $opening = trim((string) ($sentences[0] ?? ''));
        $openingNormalized = $this->normalizeText($opening);
        $anchor = $this->normalizeText((string) ($generationPlan['anchor'] ?? ''));
        $openingAnchored = $anchor !== '' && Str::contains($openingNormalized, $anchor);
        if (! $openingAnchored) {
            $keywords = $this->extractSignificantKeywords($reflectionText);
            $keywordInOpening = collect($keywords)->contains(fn (string $keyword) => Str::contains($openingNormalized, $keyword));
            if (! $keywordInOpening) {
                $reasons[] = 'opening_not_anchored';
                $reasons[] = 'low_input_alignment';
            }
        }

        $primaryTheme = (string) ($analysis['primary_theme'] ?? 'direction');
        $continuitySignals = $this->themeContinuitySignals($primaryTheme);
        $continuityHits = collect($continuitySignals)
            ->filter(fn (string $term) => Str::contains($normalizedMeditation, $term))
            ->count();
        if ($continuityHits < 2) {
            $reasons[] = 'weak_theme_continuity';
        }

        $genericPhrases = [
            'kamu tidak sendiri',
            'tuhan menyertaimu',
            'tetap semangat',
            'jalani hari ini',
            'tetap percaya',
        ];
        $genericHits = collect($genericPhrases)
            ->filter(fn (string $phrase) => Str::contains($normalizedMeditation, $this->normalizeText($phrase)))
            ->count();
        if ($genericHits >= 3) {
            $reasons[] = 'excessive_generic_phrases';
        }

        $closingRaw = trim((string) ($sentences[$sentenceCount - 1] ?? ''));
        $closingNormalized = $this->normalizeText($closingRaw);
        if (
            Str::contains($closingNormalized, 'kamu tidak berjalan sendiri')
            || Str::contains($closingNormalized, 'tuhan menyertaimu')
            || Str::contains($closingNormalized, 'tetap semangat')
        ) {
            $reasons[] = 'generic_closing';
        }

        return [
            'passed' => empty($reasons),
            'reasons' => array_values(array_unique($reasons)),
            'sentence_count' => $sentenceCount,
            'continuity_hits' => $continuityHits,
        ];
    }

    private function extractReflectionAnchor(string $reflectionText): string
    {
        $clean = trim((string) Str::of($reflectionText)->replaceMatches('/\s+/', ' '));
        if ($clean === '') {
            return 'isi hati yang kamu bawa';
        }

        if (strlen($clean) <= 72) {
            return preg_replace('/[\"\']+/', '', $clean) ?? $clean;
        }

        $keywords = $this->extractSignificantKeywords($reflectionText);
        if (! empty($keywords)) {
            return implode(' ', array_slice($keywords, 0, 4));
        }

        $excerpt = (string) Str::of($clean)->limit(72, '');
        return preg_replace('/[\"\']+/', '', trim($excerpt)) ?: 'isi hati yang sedang kamu bawa';
    }

    private function extractSignificantKeywords(string $text): array
    {
        $normalized = $this->normalizeText($text);
        return collect(explode(' ', $normalized))
            ->filter(fn (string $word) => strlen($word) >= 4)
            ->reject(fn (string $word) => in_array($word, self::STOP_WORDS, true))
            ->unique()
            ->take(6)
            ->values()
            ->all();
    }

    private function themeContinuitySignals(string $primaryTheme): array
    {
        return match ($primaryTheme) {
            'gratitude' => ['syukur', 'terima kasih', 'kemurahan', 'pujian'],
            'longing_family' => ['rindu', 'keluarga', 'penjagaan', 'menyertai'],
            'relationship_conflict' => ['relasi', 'damai', 'mengampuni', 'kasih'],
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state' => ['luka', 'hikmat', 'batas', 'damai', 'pulih'],
            'anger_conflict', 'hatred_hostility' => ['marah', 'jeda', 'kata', 'damai'],
            'anxiety' => ['cemas', 'tenang', 'napas', 'aman'],
            'fatigue' => ['lelah', 'istirahat', 'kekuatan', 'pulih'],
            'guilt', 'repentance' => ['ampun', 'pulih', 'bertobat', 'anugerah'],
            default => ['langkah', 'tuntun', 'hikmat', 'harap'],
        };
    }

    private function composeSafeFallbackMeditation(array $analysis): string
    {
        $theme = (string) ($analysis['primary_theme'] ?? 'direction');
        $emotionalNeed = (string) ($analysis['emotional_need'] ?? 'ketenangan');
        $spiritualNeed = (string) ($analysis['spiritual_need'] ?? 'pengharapan');

        $opening = match ($theme) {
            'gratitude' => 'Syukurmu hari ini adalah anugerah yang perlu dijaga dengan hati yang lembut.',
            'longing_family' => 'Kerinduanmu kepada keluarga adalah kasih yang berharga di hadapan Tuhan.',
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state' => 'Tuhan melihat isi hatimu yang kompleks dan menuntunmu dengan hikmat tanpa menyepelekan lukamu.',
            'anger_conflict', 'hatred_hostility' => 'Tuhan melihat kemarahanmu, dan Ia menolongmu menahan diri agar tidak melukai.',
            'anxiety' => 'Tuhan hadir menenangkanmu ketika hatimu terasa gelisah.',
            'fatigue' => 'Dalam kelelahanmu, Tuhan tetap menopangmu dengan kasih yang setia.',
            'guilt', 'repentance' => 'Kasih Tuhan tetap membuka jalan pengampunan dan pemulihan bagimu.',
            default => 'Tuhan memahami isi hatimu dan menuntunmu dengan lembut.',
        };

        return $opening.' Hari ini kamu membutuhkan '.$emotionalNeed.', dan Tuhan menuntunmu kepada '.$spiritualNeed.'. Kamu tidak berjalan sendiri.';
    }

    private function buildPastoralInterpretationContext(?BibleVerse $primaryVerse, array $analysis, string $reflectionText): array
    {
        $primaryTheme = (string) ($analysis['primary_theme'] ?? 'direction');
        $verseText = Str::lower((string) ($primaryVerse?->text ?? ''));
        $verseTone = $this->classifyVerseTone($verseText);
        $themeTags = $this->inferThemeTags($primaryTheme, $analysis, $verseText);
        $toneTags = array_values(array_unique(array_filter([$verseTone, (string) ($analysis['tone'] ?? null)])));

        $verseMainMessage = match ($primaryTheme) {
            'gratitude' => 'Syukur menolong hati tetap melihat kebaikan Tuhan secara konsisten.',
            'longing_family' => 'Jarak tidak memutuskan kasih dan penjagaan Tuhan atas keluarga.',
            'relationship_conflict' => 'Kasih yang sabar membuka jalan pemulihan relasi secara sehat.',
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state' => 'Tuhan tetap hadir di tengah luka pelayanan, memberi hikmat untuk pulih dan melangkah tanpa kepahitan.',
            'anger_conflict', 'hatred_hostility' => 'Kemarahan perlu ditata dalam hikmat agar tidak menjadi luka baru.',
            'anxiety' => 'Tuhan memanggil hati yang cemas untuk beristirahat dalam pemeliharaan-Nya.',
            'fatigue' => 'Kekuatan dari Tuhan cukup untuk memulihkan langkah yang lelah.',
            'guilt', 'repentance' => 'Pengampunan Tuhan memulihkan orang yang datang dengan hati yang bertobat.',
            'surrender' => 'Berserah kepada Tuhan menolong jiwa menemukan keteguhan yang tenang.',
            default => 'Tuhan memberi hikmat untuk menuntun langkah pada waktu yang tepat.',
        };

        $pastoralApplication = match ($primaryTheme) {
            'gratitude' => 'Syukurmu bukan sekadar perasaan sesaat, tetapi cara hati bertumbuh stabil dalam iman sehari-hari.',
            'longing_family' => 'Kerinduanmu bisa menjadi doa yang lembut: Tuhan menjaga keluargamu di sana, dan menguatkanmu di sini.',
            'relationship_conflict' => 'Kesembuhan relasi sering dimulai dari hati yang mau tenang dulu, lalu berbicara dengan kasih dan kejujuran.',
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state' => 'Lukamu perlu dihormati, namun jangan biarkan luka menentukan seluruh arah hidupmu; Tuhan menuntunmu membangun batas sehat, kejujuran, dan damai.',
            'anger_conflict', 'hatred_hostility' => 'Marahmu perlu diakui, tetapi tidak perlu dituruti; Tuhan menuntunmu memilih kata yang benar dan damai.',
            'anxiety' => 'Saat rasa takut muncul, kamu boleh menata napas, lalu menyerahkan hal yang tidak bisa kamu kendalikan kepada Tuhan.',
            'fatigue' => 'Kamu tidak perlu memaksa diri terlihat kuat; Tuhan juga bekerja lewat ritme istirahat dan pemulihan.',
            'guilt', 'repentance' => 'Rasa bersalah yang dibawa kepada Tuhan dapat berubah menjadi langkah pertobatan yang memulihkan hidup.',
            'surrender' => 'Berserah bukan menyerah tanpa arah, melainkan percaya bahwa Tuhan tetap memegang prosesmu.',
            default => 'Di tengah ketidakpastian, Tuhan menuntunmu setahap demi setahap melalui keputusan yang jujur dan sederhana.',
        };

        $comfortDirection = match ($primaryTheme) {
            'longing_family' => 'Tuhan hadir di dua tempat sekaligus: menyertai keluarga yang kamu rindukan dan meneguhkan hatimu di perantauan.',
            'anxiety' => 'Kamu aman untuk jujur di hadapan Tuhan, bahkan ketika hati terasa gemetar.',
            'fatigue' => 'Kasih Tuhan tidak menghakimi kelemahanmu; Ia memulihkanmu dengan sabar.',
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state' => 'Tuhan tidak menutup mata terhadap ketidakadilan yang kamu rasakan; Ia menemanimu memulihkan hati dengan perlahan.',
            'anger_conflict', 'hatred_hostility' => 'Tuhan tidak meninggalkanmu dalam emosi panas; Ia sanggup menuntunmu kembali tenang.',
            default => 'Tuhan tetap dekat dan tidak meninggalkanmu di musim ini.',
        };

        $correctionDirection = in_array($primaryTheme, ['relationship_conflict', 'guilt', 'repentance', 'anger_conflict', 'hatred_hostility'], true)
            ? 'Langkah pemulihan perlu kejujuran, kerendahan hati, dan keputusan untuk hidup seturut kehendak Tuhan.'
            : null;

        $hopeDirection = match ($primaryTheme) {
            'longing_family' => 'Harapanmu tidak sia-sia; Tuhan sanggup menjaga kasih tetap hidup sampai waktunya perjumpaan.',
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state' => 'Masa depan panggilanmu tidak berhenti pada luka hari ini; Tuhan masih sanggup menumbuhkan jalan yang sehat dan bermakna.',
            'anger_conflict', 'hatred_hostility' => 'Dengan tuntunan Tuhan, amarah yang liar bisa berubah menjadi hati yang lebih dewasa dan damai.',
            'direction' => 'Jalanmu mungkin belum lengkap terlihat, tetapi Tuhan tidak pernah terlambat memberi arah.',
            default => 'Pengharapanmu bisa bertumbuh lagi karena Tuhan setia menyelesaikan pekerjaan-Nya dalam hidupmu.',
        };

        $prayerDirection = match ($primaryTheme) {
            'longing_family' => 'Jadikan kerinduan ini doa harian: titipkan nama keluargamu satu per satu kepada Tuhan.',
            'anxiety' => 'Doakan ini dengan sederhana: Tuhan, tenangkan hatiku dan tuntun langkahku hari ini.',
            'guilt', 'repentance' => 'Berdoalah dengan jujur: Tuhan, ampuni aku, pulihkan aku, dan pimpin aku hidup benar.',
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state' => 'Doakan: Tuhan, pulihkan lukaku, beri aku hikmat menata batas yang sehat, dan tuntun aku berjalan dalam damai-Mu.',
            'anger_conflict', 'hatred_hostility' => 'Doakan: Tuhan, jaga lidahku, lembutkan hatiku, dan tuntun aku memilih damai.',
            default => 'Tutup hari ini dengan doa singkat yang jujur, lalu percayakan hasilnya kepada Tuhan.',
        };

        return [
            'verse_main_message' => $verseMainMessage,
            'verse_pastoral_theme' => $primaryTheme,
            'verse_tone' => $verseTone,
            'verse_theme_tags' => $themeTags,
            'verse_tone_tags' => $toneTags,
            'pastoral_application' => $pastoralApplication,
            'comfort_direction' => $comfortDirection,
            'correction_direction' => $correctionDirection,
            'hope_direction' => $hopeDirection,
            'prayer_direction' => $prayerDirection,
            'audience_language_notes' => 'Bahasa Indonesia sederhana, hangat, non-akademik, mudah dipahami lintas usia.',
            'input_echo' => trim((string) Str::of($reflectionText)->replaceMatches('/\s+/', ' ')->limit(120, '')),
        ];
    }

    private function inferThemeTags(string $primaryTheme, array $analysis, string $verseText): array
    {
        $base = match ($primaryTheme) {
            'gratitude' => ['gratitude', 'worship', 'hope'],
            'longing_family' => ['longing', 'family', 'protection', 'comfort', 'hope'],
            'relationship_conflict' => ['restoration', 'peace', 'love'],
            'ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state' => ['healing', 'wisdom', 'peace', 'calling', 'restoration'],
            'anger_conflict', 'hatred_hostility' => ['self_control', 'peace', 'wisdom', 'repentance'],
            'anxiety' => ['peace', 'comfort', 'trust', 'perseverance'],
            'fatigue' => ['restoration', 'strength', 'comfort'],
            'guilt', 'repentance' => ['repentance', 'restoration', 'grace'],
            'surrender' => ['trust', 'guidance', 'peace'],
            default => ['guidance', 'hope', 'trust'],
        };

        if (Str::contains($verseText, 'jangan takut') || Str::contains($verseText, 'damai')) {
            $base[] = 'peace';
        }
        if (Str::contains($verseText, 'hikmat') || Str::contains($verseText, 'jalan')) {
            $base[] = 'guidance';
        }
        if (((string) ($analysis['relational_context'] ?? '')) === 'longing') {
            $base[] = 'longing';
        }

        return array_values(array_unique($base));
    }

    private function ensurePastoralOriginality(string $meditation, string $verseText, array $analysis, array $interpretation): string
    {
        $verseNormalized = $this->normalizeText($verseText);
        $meditationNormalized = $this->normalizeText($meditation);

        if ($verseNormalized === '' || $meditationNormalized === '') {
            return $meditation;
        }

        if (! $this->hasDirectVersePhraseBorrowing($meditationNormalized, $verseNormalized)) {
            return $meditation;
        }

        $safe = $this->composeSafeFallbackMeditation($analysis).' '.(string) ($interpretation['comfort_direction'] ?? '').' '.(string) ($interpretation['prayer_direction'] ?? '');
        $this->usedFallbackContent = true;
        return $this->finalizeMeditationText($safe, $analysis);
    }

    private function hasDirectVersePhraseBorrowing(string $meditationNormalized, string $verseNormalized): bool
    {
        $verseWords = collect(explode(' ', $verseNormalized))
            ->filter(fn (string $word) => strlen($word) >= 4 && ! in_array($word, self::STOP_WORDS, true))
            ->values()
            ->all();

        if (count($verseWords) < 5) {
            return false;
        }

        for ($i = 0; $i <= count($verseWords) - 4; $i++) {
            $ngram = implode(' ', array_slice($verseWords, $i, 4));
            if ($ngram !== '' && Str::contains($meditationNormalized, $ngram)) {
                return true;
            }
        }

        return false;
    }

    private function resolveRelationalContext(array $contextFlags): string
    {
        if (($contextFlags['has_family_terms'] ?? false) && ($contextFlags['has_longing_terms'] ?? false)) {
            return 'longing';
        }
        if (
            ($contextFlags['has_ministry_terms'] ?? false)
            || ($contextFlags['has_church_hurt_terms'] ?? false)
            || ($contextFlags['has_exploitation_terms'] ?? false)
            || ($contextFlags['has_authority_wound_terms'] ?? false)
        ) {
            return 'institutional_pain';
        }
        if (($contextFlags['has_harm_terms'] ?? false) || ($contextFlags['has_anger_terms'] ?? false)) {
            return 'hostile';
        }
        if ($contextFlags['has_conflict_terms'] ?? false) {
            return 'conflict';
        }

        return 'neutral';
    }

    private function resolveIntent(array $intentScores, string $primaryTheme, string $normalizedText): string
    {
        if (in_array($primaryTheme, ['ministry_disillusionment', 'church_hurt', 'calling_conflict', 'exploitation', 'institutional_disappointment', 'authority_wound', 'mixed_emotional_state'], true)) {
            return 'seek_peace';
        }

        $bestIntent = array_key_first($intentScores);
        if (is_string($bestIntent) && ($intentScores[$bestIntent] ?? 0) >= 1.0) {
            return $bestIntent;
        }

        if ($primaryTheme === 'longing_family') {
            return 'seek_comfort';
        }
        if ($primaryTheme === 'gratitude') {
            return 'express_gratitude';
        }
        if (in_array($primaryTheme, ['guilt', 'repentance'], true)) {
            return 'confess';
        }
        if (in_array($primaryTheme, ['anger_conflict', 'hatred_hostility'], true)) {
            return 'process_anger';
        }
        if ($primaryTheme === 'direction' || Str::contains($normalizedText, 'keputusan')) {
            return 'guidance';
        }
        if ($primaryTheme === 'surrender') {
            return 'surrender_burden';
        }

        return 'guidance';
    }

    private function inferTone(string $primaryEmotion, array $contextFlags): string
    {
        if ($primaryEmotion === 'positive') {
            return 'positive';
        }
        if (in_array($primaryEmotion, ['fearful', 'exhausted', 'guilty', 'sad'], true)) {
            return 'negative';
        }
        if (in_array($primaryEmotion, ['angry', 'hostile', 'resentful'], true)) {
            return 'restrained';
        }
        if (($contextFlags['has_longing_terms'] ?? false) && ($contextFlags['has_family_terms'] ?? false)) {
            return 'tender';
        }

        return 'neutral';
    }

    private function detectContextFlags(string $normalizedText): array
    {
        return [
            'has_family_terms' => $this->containsAny($normalizedText, ['anak', 'istri', 'suami', 'keluarga', 'orang tua']),
            'has_longing_terms' => $this->containsAny($normalizedText, ['rindu', 'kangen', 'merindukan', 'jauh', 'terpisah', 'pisah']),
            'has_conflict_terms' => $this->containsAny($normalizedText, ['konflik', 'bertengkar', 'marah', 'sakit hati', 'bermusuhan', 'kecewa']),
            'has_gratitude_terms' => $this->containsAny($normalizedText, ['syukur', 'bersyukur', 'berkat', 'terima kasih', 'puji']),
            'has_harm_terms' => $this->containsAny($normalizedText, ['ingin memaki', 'maki', 'balas dendam', 'dendam', 'sakitin', 'hancurin', 'ingin balas']),
            'has_anger_terms' => $this->containsAny($normalizedText, ['marah', 'kesal', 'jengkel', 'muak', 'emosi', 'benci']),
            'has_guilt_terms' => $this->containsAny($normalizedText, ['bersalah', 'dosa', 'ampun', 'menyesal', 'bertobat']),
            'has_fear_terms' => $this->containsAny($normalizedText, ['cemas', 'khawatir', 'takut', 'gelisah', 'resah']),
            'has_exhaustion_terms' => $this->containsAny($normalizedText, ['lelah', 'letih', 'capek', 'jenuh', 'burnout']),
            'has_ministry_terms' => $this->containsAny($normalizedText, ['pelayanan', 'pendeta', 'melayani', 'talenta', 'perantau pelayanan']),
            'has_church_hurt_terms' => $this->containsAny($normalizedText, ['luka gereja', 'tersakiti di gereja', 'kecewa gereja', 'trauma gereja', 'disakiti pemimpin']),
            'has_calling_terms' => $this->containsAny($normalizedText, ['panggilan', 'talenta', 'arah hidup', 'tetap atau berhenti', 'tidak sanggup bertahan']),
            'has_exploitation_terms' => $this->containsAny($normalizedText, ['dimanfaatkan', 'dieksploitasi', 'hanya dipakai', 'dipakai untuk kepentingan']),
            'has_institution_terms' => $this->containsAny($normalizedText, ['institusi', 'organisasi', 'sistem', 'struktur', 'budaya kerja']),
            'has_authority_wound_terms' => $this->containsAny($normalizedText, ['senior', 'otoritas', 'pemimpin', 'atasan rohani', 'dipaksa', 'ditekan']),
        ];
    }

    private function scoreProfiles(string $normalizedText, array $profiles): array
    {
        $scores = [];
        foreach ($profiles as $key => $profile) {
            $keywords = is_array($profile) && array_key_exists('keywords', $profile) ? (array) $profile['keywords'] : (array) $profile;
            $score = 0.0;
            foreach ($keywords as $keyword) {
                $needle = trim(Str::lower((string) $keyword));
                if ($needle === '') {
                    continue;
                }
                if (Str::contains($normalizedText, $needle)) {
                    $score += strlen($needle) >= 7 ? 1.4 : 1.0;
                }
            }
            if ($score > 0) {
                $scores[$key] = $score;
            }
        }

        return $scores;
    }

    private function classifyVerseTone(string $verseText): string
    {
        $toneKeywords = [
            'comforting' => ['jangan takut', 'jangan khawatir', 'damai', 'tenang', 'menyertai', 'penghiburan', 'pelihara', 'lindungi'],
            'worshipful' => ['bersyukur', 'pujilah', 'muliakan', 'sukacita', 'sorak', 'memuji'],
            'guiding' => ['hikmat', 'jalan', 'tuntun', 'nasihat', 'percaya', 'langkah'],
            'restorative' => ['ampun', 'anugerah', 'dipulihkan', 'belas kasihan', 'mengampuni'],
            'corrective' => ['bertobat', 'hukuman', 'tegur', 'kesalahan', 'jangan berbuat'],
            'restraining' => ['lambat untuk marah', 'jangan membalas', 'perkataan kotor', 'jaga lidah', 'lemah lembut'],
            'reassuring' => ['menopang', 'setia', 'tidak meninggalkan', 'pengharapan'],
            'tender' => ['dekat kepada', 'air mata', 'remuk hati', 'merindukan'],
        ];

        $scores = [];
        foreach ($toneKeywords as $tone => $keywords) {
            $scores[$tone] = 0;
            foreach ($keywords as $keyword) {
                if (Str::contains($verseText, $keyword)) {
                    $scores[$tone] += 1;
                }
            }
        }

        arsort($scores, SORT_NUMERIC);
        $topTone = (string) (array_key_first($scores) ?? 'comforting');
        return ($scores[$topTone] ?? 0) > 0 ? $topTone : 'comforting';
    }

    private function computeIntensity(string $rawText, array $themeScores, array $emotionScores): int
    {
        $base = (int) round(max(array_sum($themeScores), array_sum($emotionScores)));
        $punctuationBoost = preg_match_all('/[!?]/', $rawText) ?: 0;
        $wordCount = str_word_count($rawText);
        $lengthBoost = $wordCount >= 12 ? 1 : 0;
        $intensity = $base + $punctuationBoost + $lengthBoost;

        return max(1, min(5, $intensity));
    }

    private function elapsedMs(float $startedAt): int
    {
        return (int) round((microtime(true) - $startedAt) * 1000);
    }

    private function roundScores(array $scores): array
    {
        return collect($scores)
            ->map(fn ($score) => round((float) $score, 2))
            ->all();
    }

    private function normalizeText(string $text): string
    {
        return (string) Str::of(Str::lower($text))
            ->replaceMatches('/[^a-z0-9\s]/', ' ')
            ->replaceMatches('/\s+/', ' ')
            ->trim();
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (Str::contains($haystack, Str::lower((string) $needle))) {
                return true;
            }
        }

        return false;
    }
}
