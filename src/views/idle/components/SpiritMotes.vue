<template>
    <div class="spirit-motes" aria-hidden="true">
        <span v-for="(m, i) in motes" :key="i" :class="'mote-g' + m.g" :style="styleOf(m)" />
    </div>
</template>

<script setup>
    // 灵气粒子: 纯 CSS 动画, 确定性伪随机分布(避免每次渲染闪变)
    const motes = Array.from({ length: 16 }, (_, i) => ({
        left: (i * 6.35 + (i * 37) % 11) % 100,
        size: 2.5 + (i * 7) % 4,
        dur: 9 + (i * 13) % 11,
        delay: -((i * 2.37) % 14),
        sway: 14 + (i * 17) % 34,
        g: i % 3
    }));

    const styleOf = m => ({
        left: m.left + '%',
        width: m.size + 'px',
        height: m.size + 'px',
        animationDuration: m.dur + 's',
        animationDelay: m.delay + 's',
        '--sway': m.sway
    });
</script>
