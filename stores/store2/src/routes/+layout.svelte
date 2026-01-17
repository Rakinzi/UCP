<script lang="ts">
	import '@smui/common/styles.css';
	import '@smui/button/bare.css';
	import '@smui/card/bare.css';
	import '@smui/textfield/bare.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
