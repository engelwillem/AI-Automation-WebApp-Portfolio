<?php

namespace App\Http\Controllers;

use App\Models\BibleVerse;
use App\Models\MemberPost;
use App\Models\ReflectionResponse;
use App\Models\UserMetric;
use App\Models\UserVerseAction;
use App\Services\UserMetricsService;
use App\Services\VerseHubActivityService;
use App\Services\VerseHubMentorService;
use App\Support\VerseHubHomeVerse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;

class VerseHubReaderController extends Controller
{
    private const ACTIVITY_QUOTE_POST_TYPE = 'versehub_activity_quote';
    private const ID_BOOK_ORDER = [
        'kej', 'kel', 'ima', 'bil', 'uli', 'yos', 'hak', 'rut', '1sam', '2sam', '1raj', '2raj', '1taw', '2taw', 'ezr', 'neh', 'est', 'ayb', 'mzm', 'ams', 'pkh', 'kid', 'yes', 'yer', 'rat', 'yeh', 'dan', 'hos', 'yoe', 'amo', 'oba', 'yun', 'mik', 'nah', 'hab', 'zef', 'hag', 'zak', 'mal', 'mat', 'mrk', 'luk', 'yoh', 'kis', 'rom', '1kor', '2kor', 'gal', 'ef', 'flp', 'kol', '1tes', '2tes', '1tim', '2tim', 'tit', 'flm', 'ibr', 'yak', '1ptr', '2ptr', '1yoh', '2yoh', '3yoh', 'yud', 'why',
    ];

    public const ID_BOOK_LABELS = [
        'kej' => 'Kejadian', 'kel' => 'Keluaran', 'ima' => 'Imamat', 'bil' => 'Bilangan', 'uli' => 'Ulangan', 'yos' => 'Yosua', 'hak' => 'Hakim-hakim', 'rut' => 'Rut', '1sam' => '1 Samuel', '2sam' => '2 Samuel', '1raj' => '1 Raja-raja', '2raj' => '2 Raja-raja', '1taw' => '1 Tawarikh', '2taw' => '2 Tawarikh', 'ezr' => 'Ezra', 'neh' => 'Nehemia', 'est' => 'Ester', 'ayb' => 'Ayub', 'mzm' => 'Mazmur', 'ams' => 'Amsal', 'pkh' => 'Pengkhotbah', 'kid' => 'Kidung Agung', 'yes' => 'Yesaya', 'yer' => 'Yeremia', 'rat' => 'Ratapan', 'yeh' => 'Yehezkiel', 'dan' => 'Daniel', 'hos' => 'Hosea', 'yoe' => 'Yoel', 'amo' => 'Amos', 'oba' => 'Obaja', 'yun' => 'Yunus', 'mik' => 'Mikha', 'nah' => 'Nahum', 'hab' => 'Habakuk', 'zef' => 'Zefanya', 'hag' => 'Hagai', 'zak' => 'Zakharia', 'mal' => 'Maleakhi', 'mat' => 'Matius', 'mrk' => 'Markus', 'luk' => 'Lukas', 'yoh' => 'Yohanes', 'kis' => 'Kisah Para Rasul', 'rom' => 'Roma', '1kor' => '1 Korintus', '2kor' => '2 Korintus', 'gal' => 'Galatia', 'ef' => 'Efesus', 'flp' => 'Filipi', 'kol' => 'Kolose', '1tes' => '1 Tesalonika', '2tes' => '2 Tesalonika', '1tim' => '1 Timotius', '2tim' => '2 Timotius', 'tit' => 'Titus', 'flm' => 'Filemon', 'ibr' => 'Ibrani', 'yak' => 'Yakobus', '1ptr' => '1 Petrus', '2ptr' => '2 Petrus', '1yoh' => '1 Yohanes', '2yoh' => '2 Yohanes', '3yoh' => '3 Yohanes', 'yud' => 'Yudas', 'why' => 'Wahyu',
        'am' => 'Amos', 'im' => 'Imamat', 'mi' => 'Mikha', 'ob' => 'Obaja', 'rm' => 'Roma', 'ul' => 'Ulangan', 'yl' => 'Yoel', 'za' => 'Zakharia',
    ];

    private const ID_NT_CODES = [
        'mat', 'mrk', 'luk', 'yoh', 'kis', 'rom', '1kor', '2kor', 'gal', 'ef', 'flp', 'kol', '1tes', '2tes', '1tim', '2tim', 'tit', 'flm', 'ibr', 'yak', '1ptr', '2ptr', '1yoh', '2yoh', '3yoh', 'yud', 'why',
    ];

    public function getBooksApi(string $lang): JsonResponse
    {
        $codes = $this->availableBookCodesCanonical($lang);
        $books = $this->buildBooks($codes);
        return response()->json(['books' => $books]);
    }

    public function getChapterContentApi(string $lang, string $ref): JsonResponse
    {
        $bookCodes = $this->availableBookCodesCanonical($lang);
        $parsedRef = $this->parseChapterRef($ref);
        if (!$parsedRef) return response()->json(['message' => 'Invalid reference'], 400);

        $book = $this->resolveIdBookCode($parsedRef['book']) ?? $parsedRef['book'];
        $chapter = $parsedRef['chapter'];

        $books = $this->buildBooks($bookCodes);
        $data = $this->buildChapterViewData($lang, $book, $chapter, $books, $bookCodes);

        if (!$data) return response()->json(['message' => 'Chapter not found'], 404);

        return response()->json($data);
    }

    public function index(Request $request, string $lang)
    {
        abort_unless(in_array($lang, ['id', 'en'], true), 404);
        if ($lang === 'en') return redirect()->to('/versehub/id');

        $bookCodes = $this->availableBookCodesCanonical($lang);
        $books = $this->buildBooks($bookCodes);
        return response()->json(['books' => $books]);
    }

    public function chapter(Request $request, string $chapterRef)
    {
        $chapterRef = Str::lower(trim($chapterRef));
        $parsedRef = $this->parseChapterRef($chapterRef);
        abort_unless($parsedRef !== null, 404);

        $book = $parsedRef['book'];
        $chapter = $parsedRef['chapter'];
        $lang = 'id'; // Default for web view
        $bookCodes = $this->availableBookCodesCanonical($lang);
        $canonicalBook = $this->resolveIdBookCode($book) ?? $book;

        $books = $this->buildBooks($bookCodes);
        $chapterData = $this->buildChapterViewData($lang, $canonicalBook, $chapter, $books, $bookCodes);
        abort_unless($chapterData !== null, 404);

        return response()->json($chapterData);
    }

    public function chapters(string $lang, Request $request)
    {
        $book = Str::lower(trim((string) $request->query('book', '')));
        $book = $this->resolveIdBookCode($book) ?? $book;
        if ($book === '') return response()->json(['book' => null, 'chapters' => []]);

        $chapters = BibleVerse::query()
            ->where('provider', 'ayt')
            ->where('lang', $lang)
            ->whereIn('book_code', $this->idBookQueryCodes($book))
            ->distinct()
            ->orderBy('chapter')
            ->pluck('chapter')
            ->map(fn($c) => (int) $c)
            ->all();
        $chapters = $this->normalizeChapterList($book, $chapters);

        return response()->json(['book' => $book, 'chapters' => $chapters]);
    }

    private function buildChapterViewData(string $lang, string $book, int $chapter, array $books, array $bookCodes, array $verseFilter = []): ?array
    {
        if ($chapter < 1 || !in_array($book, $bookCodes, true)) return null;

        $queryCodes = $this->idBookQueryCodes($book);
        $chapters = BibleVerse::query()
            ->where('provider', 'ayt')
            ->where('lang', $lang)
            ->whereIn('book_code', $queryCodes)
            ->distinct()
            ->orderBy('chapter')
            ->pluck('chapter')
            ->map(fn($c) => (int) $c)
            ->all();
        $chapters = $this->normalizeChapterList($book, $chapters);

        if (!in_array($chapter, $chapters, true)) return null;

        $bookLabel = Arr::first($books, fn($b) => $b['code'] === $book)['label'] ?? Str::upper($book);
        $chapterLabel = $bookLabel . ' ' . $chapter;

        $verses = BibleVerse::query()
            ->select(['verse', 'text'])
            ->where('provider', 'ayt')
            ->where('lang', $lang)
            ->whereIn('book_code', $queryCodes)
            ->where('chapter', $chapter)
            ->orderBy('verse')
            ->get()
            ->map(function (BibleVerse $v) use ($book, $chapter) {
                $verseNumber = (int) $v->verse;
                $ref = sprintf('%s-%d-%d', $book, $chapter, $verseNumber);
                return [
                    'verse' => $verseNumber,
                    'text' => (string) $v->text,
                    'href' => url('/versehub/id/' . $ref),
                    'key' => $ref,
                ];
            })
            ->all();

        return [
            'selected_book' => $book,
            'selected_chapter' => $chapter,
            'chapters' => $chapters,
            'chapter_label' => $chapterLabel,
            'verses' => $verses,
            'reflection_question' => $this->getChapterReflection($book, $chapter),
            'has_reflected' => false,
        ];
    }

    private function getChapterReflection(string $book, int $chapter): string
    {
        return \Illuminate\Support\Facades\Cache::remember(
            "vh:chapter_reflect:{$book}:{$chapter}",
            now()->addDay(),
            function() use ($book, $chapter) {
                $mentor = app(VerseHubMentorService::class);
                $insights = $mentor->getGuidedInsights($book, $chapter, 1);
                return $insights['reflection_questions'][0] ?? 'Bagaimana ayat-ayat ini menguatkan imanmu hari ini?';
            }
        );
    }

    private function resolveIdBookCode(string $book): ?string
    {
        $book = Str::lower(trim($book));
        $map = config('versehub_books.id');
        $aliases = config('versehub_books.aliases');
        if (is_array($map) && array_key_exists($book, $map)) return $book;
        if (!is_array($aliases)) return null;
        $alias = $aliases[$book] ?? null;
        if (!is_string($alias)) return null;
        $alias = Str::lower(trim($alias));
        if (is_array($map) && array_key_exists($alias, $map)) return $alias;
        return null;
    }

    private function availableBookCodesCanonical(string $lang): array
    {
        $rawCodes = BibleVerse::query()
            ->where('provider', 'ayt')
            ->where('lang', $lang)
            ->distinct()
            ->pluck('book_code')
            ->map(fn($x) => Str::lower((string) $x))
            ->all();

        $canonicalSet = [];
        foreach ($rawCodes as $raw) {
            $canonical = $this->resolveIdBookCode($raw) ?? $raw;
            $canonicalSet[$canonical] = true;
        }

        $codes = array_keys($canonicalSet);
        $orderIdx = array_flip(self::ID_BOOK_ORDER);
        usort($codes, function (string $a, string $b) use ($orderIdx) {
            $ai = $orderIdx[$a] ?? 999;
            $bi = $orderIdx[$b] ?? 999;
            return $ai <=> $bi;
        });

        return $codes;
    }

    private function buildBooks(array $codes): array
    {
        return array_map(function (string $code) {
            return [
                'code' => $code,
                'label' => self::ID_BOOK_LABELS[$code] ?? Str::upper($code),
                'testament' => in_array($code, self::ID_NT_CODES, true) ? 'nt' : 'ot',
            ];
        }, $codes);
    }

    private function idBookQueryCodes(string $canonicalBook): array
    {
        $canonicalBook = Str::lower(trim($canonicalBook));
        $aliases = config('versehub_books.aliases', []);
        $codes = [$canonicalBook];
        foreach ($aliases as $alias => $target) {
            if (Str::lower(trim($target)) === $canonicalBook) $codes[] = Str::lower(trim($alias));
        }
        return array_values(array_unique($codes));
    }

    private function parseChapterRef(string $raw): ?array
    {
        $s = Str::lower(trim($raw));
        if (preg_match('/^(?<book>[a-z0-9]+)[\-_.](?<ch>\d+)$/', $s, $m)) return ['book' => (string) $m['book'], 'chapter' => (int) $m['ch']];
        if (preg_match('/^(?<book>[a-z0-9]*[a-z])(?<ch>\d+)$/', $s, $m)) return ['book' => (string) $m['book'], 'chapter' => (int) $m['ch']];
        return null;
    }

    private function normalizeChapterList(string $book, array $chapters): array
    {
        $normalized = array_values(array_unique(array_filter(array_map('intval', $chapters), fn(int $chapter) => $chapter > 0)));
        sort($normalized);
        return $normalized;
    }
}
