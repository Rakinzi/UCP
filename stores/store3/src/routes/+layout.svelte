<script lang="ts">
	import '@steeze-ui/components/base.css';
	import '@steeze-ui/components/core.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
