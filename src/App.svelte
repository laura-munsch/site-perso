<script>
    import { onMount } from "svelte";
    import { Router, Route } from "svelte-routing";
    import Home from "./pages/Home.svelte";
    import Project from "./pages/Project.svelte";
    import ASScroll from "@ashthornton/asscroll";
    import { asscroll } from "./stores";

    export let url = "";

    onMount(() => {
        if (window.innerWidth >= 1080) {
            $asscroll = new ASScroll();
        }
    });
</script>

<div asscroll-container>
    <Router {url}>
        <Route path="/" component={Home} />
        <Route path="projets/:slug" let:params>
            <Project slug={params.slug} />
        </Route>
    </Router>
</div>

<style global type="text/scss">
    @import "assets/styles/global.scss";
</style>
