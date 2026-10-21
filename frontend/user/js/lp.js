/* R-EDGER LP
 * - ふりがな ON/OFF
 * - 料金カードの級切り替え / スクロール表示
 * - 申し込み・ログインのモーダル（バックエンド接続前は「準備中」を表示）
 */
(function () {
    'use strict';

    var CONFIG = window.REDGER_CONFIG || {};
    var FURIGANA_KEY = 'redger_furigana';
    var GRADE_LABELS = { '4': '4級', '3': '3級', '2': '2級商業簿記' };
    var PAYMENT_LABELS = { card: 'クレジットカード', konbini: 'コンビニ払い', bank_transfer: '銀行振込' };

    function apiReady() {
        return /^https:\/\//.test(CONFIG.API_URL || '');
    }

    /* ---------- ふりがな ---------- */
    function initFurigana() {
        var root = document.documentElement;
        var sw = document.getElementById('furiganaSwitch');
        if (!sw) return;

        function apply(on) {
            root.classList.toggle('furigana-off', !on);
            sw.setAttribute('aria-checked', String(on));
        }
        apply(!root.classList.contains('furigana-off'));

        sw.addEventListener('click', function () {
            var on = sw.getAttribute('aria-checked') !== 'true';
            apply(on);
            try { localStorage.setItem(FURIGANA_KEY, on ? 'on' : 'off'); } catch (e) { /* 保存できなくても表示は切り替わる */ }
        });
    }

    /* ---------- スクロール表示 ---------- */
    function initReveal() {
        var items = document.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('active'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        items.forEach(function (el) { io.observe(el); });
    }

    /* ---------- スマホ下部の申し込みバー（料金セクション表示中は隠す） ---------- */
    function initMobileCta() {
        var bar = document.getElementById('mobileCta');
        var price = document.getElementById('pricing');
        if (!bar || !price || !('IntersectionObserver' in window)) return;
        new IntersectionObserver(function (entries) {
            bar.classList.toggle('is-hidden', entries[0].isIntersecting);
        }, { threshold: 0.15 }).observe(price);
    }

    /* ---------- モーダル ---------- */
    function openDialog(id) {
        var dlg = document.getElementById(id);
        if (!dlg) return;
        if (typeof dlg.showModal === 'function') {
            if (!dlg.open) dlg.showModal();
        } else {
            dlg.setAttribute('open', '');
        }
    }
    function closeDialog(dlg) {
        if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    }

    function initDialogs() {
        document.addEventListener('click', function (e) {
            var opener = e.target.closest('[data-open]');
            if (opener) { e.preventDefault(); openDialog(opener.getAttribute('data-open')); return; }
            var closer = e.target.closest('[data-close]');
            if (closer) { closeDialog(closer.closest('dialog')); return; }
            // 背景(ダイアログの外側)をクリックしたら閉じる
            if (e.target.tagName === 'DIALOG') closeDialog(e.target);
        });
    }

    function setMsg(el, text, isError) {
        el.textContent = text;
        el.classList.toggle('is-error', !!isError);
    }

    /* ---------- 料金カード → 申し込みフォーム ---------- */
    var selection = { grade: '3', payment: 'card' };

    function initPrice() {
        var form = document.getElementById('priceForm');
        if (!form) return;

        // 級を切り替えたら、カードの表示（LVバッジ・級名・収録内容・ボタン）を更新する
        function updateGrade() {
            var g = (form.querySelector('input[name="grade"]:checked') || {}).value || '3';
            form.setAttribute('data-game-id', 'SECTOR-0' + g);
            document.getElementById('lvBadge').textContent = 'LV.0' + g + ' ENTRY';
            document.getElementById('selectLabel').textContent = 'SELECT LEVEL0' + g;
            form.querySelectorAll('[data-grade-name]').forEach(function (el) {
                el.hidden = el.getAttribute('data-grade-name') !== g;
            });
            form.querySelectorAll('.topic-list').forEach(function (ul) {
                ul.hidden = ul.getAttribute('data-grade') !== g;
            });
        }
        form.querySelectorAll('input[name="grade"]').forEach(function (r) {
            r.addEventListener('change', updateGrade);
        });
        updateGrade();
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var fd = new FormData(form);
            selection.grade = fd.get('grade') || '3';
            selection.payment = fd.get('payment') || 'card';

            var summary = document.getElementById('applySummary');
            summary.replaceChildren();
            [
                '全経 ' + GRADE_LABELS[selection.grade],
                PAYMENT_LABELS[selection.payment],
                '¥' + Number(CONFIG.PRICE || 1500).toLocaleString('ja-JP') + '（税込）'
            ].forEach(function (text) {
                var s = document.createElement('span');
                s.textContent = text;
                summary.append(s);
            });
            setMsg(document.getElementById('applyMsg'), '');
            openDialog('applyDialog');
        });
    }

    function initApply() {
        var form = document.getElementById('applyForm');
        if (!form) return;
        var msg = document.getElementById('applyMsg');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var fd = new FormData(form);
            var name = String(fd.get('name') || '').trim();
            var email = String(fd.get('email') || '').trim();
            var pw = String(fd.get('password') || '');
            var pw2 = String(fd.get('passwordConfirm') || '');

            if (!name || !email) return setMsg(msg, 'お名前とメールアドレスを入力してください。', true);
            if (!form.elements.email.checkValidity()) return setMsg(msg, 'メールアドレスの形式を確認してください。', true);
            if (pw.length < 8) return setMsg(msg, 'パスワードは8文字以上で入力してください。', true);
            if (pw !== pw2) return setMsg(msg, 'パスワード（確認）が一致しません。', true);
            if (!fd.get('agree')) return setMsg(msg, '利用規約とプライバシーポリシーへの同意が必要です。', true);

            if (!apiReady()) {
                return setMsg(msg, '現在、お申し込みの受付を準備中です。公開まで今しばらくお待ちください。');
            }
            // TODO: バックエンド(GAS)へ送信し、Stripe の決済画面へ移動する（次のステップで実装）
            setMsg(msg, 'お申し込み機能は準備中です。');
        });
    }

    function initLogin() {
        var form = document.getElementById('loginForm');
        if (!form) return;
        var msg = document.getElementById('loginMsg');
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!apiReady()) {
                return setMsg(msg, 'ログイン機能は準備中です。公開まで今しばらくお待ちください。');
            }
            // TODO: auth.js でログイン処理を実装する
            setMsg(msg, 'ログイン機能は準備中です。');
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initFurigana();
        initReveal();
        initMobileCta();
        initDialogs();
        initPrice();
        initApply();
        initLogin();
    });
})();
