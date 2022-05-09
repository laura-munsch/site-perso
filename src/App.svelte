<script>
    import { Router, Route } from "svelte-routing";
    import Home from "./pages/Home.svelte"
    import Project from "./pages/Project.svelte"

    export let url = "";
</script>

<Router url="{url}"> 
    <Route path="/" component={Home} />
    <Route path="projets/:slug" let:params>
        <Project slug="{ params.slug} " />
    </Route>
</Router>