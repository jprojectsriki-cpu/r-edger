/* R-EDGER LP - Three.js 3D背景（スクロール・マウス連動） */
(function () {
    'use strict';

    var container = document.getElementById('bg-canvas-container');
    if (!container || typeof THREE === 'undefined') return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
        return; // WebGLが使えない環境では背景なしで表示する
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    var group = new THREE.Group();
    scene.add(group);

    // 大型ワイヤーフレーム（正二十面体）
    var icosahedron = new THREE.Mesh(
        new THREE.IcosahedronGeometry(4.5, 1),
        new THREE.MeshBasicMaterial({ color: 0x0088CC, wireframe: true, transparent: true, opacity: 0.3 })
    );
    group.add(icosahedron);

    // 内部の回転オブジェクト（八面体）
    var octahedron = new THREE.Mesh(
        new THREE.OctahedronGeometry(2.2, 0),
        new THREE.MeshBasicMaterial({ color: 0xFF4500, wireframe: true, transparent: true, opacity: 0.35 })
    );
    group.add(octahedron);

    // 浮遊パーティクル
    var count = 250;
    var positions = new Float32Array(count * 3);
    for (var i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 35;
    var particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var particles = new THREE.Points(
        particlesGeometry,
        new THREE.PointsMaterial({ color: 0x0088CC, size: 0.09, transparent: true, opacity: 0.6 })
    );
    scene.add(particles);

    camera.position.z = 10;

    var mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    var currentScrollY = window.scrollY, targetScrollY = window.scrollY;

    document.addEventListener('mousemove', function (e) {
        mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
        mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
    });
    window.addEventListener('scroll', function () { targetScrollY = window.scrollY; }, { passive: true });

    function frame() {
        currentScrollY += (targetScrollY - currentScrollY) * 0.08;
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        var s = currentScrollY * 0.0025;
        group.rotation.x = s + targetY * 2;
        group.rotation.y = s * 1.2 + targetX * 2;
        group.position.y = Math.sin(s * 2) * 1.8;
        group.position.z = Math.cos(s * 1.5) * 3.0;

        icosahedron.rotation.y -= 0.002;
        octahedron.rotation.x += 0.005;
        particles.rotation.y = s * 0.4;

        renderer.render(scene, camera);
    }

    if (reduceMotion) {
        // 動きを減らす設定の場合は1回だけ描画する
        frame();
    } else {
        (function loop() { requestAnimationFrame(loop); frame(); })();
    }

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (reduceMotion) frame();
    });
})();
