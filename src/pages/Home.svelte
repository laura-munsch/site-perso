<script>
    import createClient from "../lib/prismicClient";
    import * as prismicH from "@prismicio/helpers";
    import Loader from "../components/Loader.svelte";
    import { onMount } from "svelte";
    import { asscroll } from "../stores";
    import ProjectItem from "../components/ProjectItem.svelte";

    // fetch the data
    const client = createClient();
    const prismicQuery = client.getSingle("home");

    let cssVar;

    onMount(() => {
        $asscroll.enable({
            newScrollElements: document.querySelector(".scroll-ctn"),
            horizontalScroll: true,
            reset: true,
        });

        $asscroll.on("scroll", (scrollPos) => {
            cssVar = `--scroll-pos:${scrollPos}px`;
        });

        return () => {
            $asscroll.disable();
        };
    });
</script>

<div class="scroll-ctn" style={cssVar}>
    {#await prismicQuery}
        <Loader />
    {:then home}
        <header>
            <h1>
                <span class="title">{prismicH.asText(home.data.title)}</span>
                <span class="title-bis">
                    {prismicH.asText(home.data.titlebis)}
                </span>
            </h1>

            <h2>{prismicH.asText(home.data.subtitle)}</h2>
        </header>

        <main>
            {#each home.data.body as timelinePiece}
                <div class="project">
                    <p class="year">
                        {prismicH.asText(timelinePiece.primary.year)}
                    </p>
                    <div class="description">
                        {@html prismicH.asHTML(timelinePiece.primary.title)}
                    </div>

                    {#each timelinePiece.items as item}
                        <ProjectItem {item} {client} />
                    {/each}
                </div>
            {/each}
        </main>
    {:catch error}
        <pre>{error.message}</pre>
    {/await}
</div>

<style type="text/scss">
    @import "../assets/styles/home.scss";
</style>
