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
    let headerClass = "initial";

    onMount(() => {
        $asscroll.enable({
            newScrollElements: document.querySelector(".scroll-ctn"),
            horizontalScroll: true,
            reset: true,
        });

        $asscroll.on("scroll", (scrollPos) => {
            cssVar = `--scroll-px:${scrollPos}px; --scroll-deg:${scrollPos}deg`;

            if (scrollPos < 1) {
                headerClass = "initial";
            } else {
                headerClass = "scrolled";
            }
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
        <header class={headerClass}>
            <img
                src="images/monogramme-blanc.png"
                alt="Monogramme en forme de visage avec un L et un M"
                class="logo"
            />

            <h1>
                <span class="title">{prismicH.asText(home.data.title)}</span>
                <span class="title-bis">
                    {prismicH.asText(home.data.titlebis)}
                </span>
            </h1>

            <h2>{prismicH.asText(home.data.subtitle)}</h2>

            <img
                src="/images/big-purple-star.svg"
                alt=""
                class="star"
                id="star-1"
            />
            <img
                src="/images/big-purple-star.svg"
                alt=""
                class="star"
                id="star-2"
            />
            <img
                src="/images/big-purple-star.svg"
                alt=""
                class="star"
                id="star-3"
            />
            <img
                src="/images/small-purple-star.svg"
                alt=""
                class="star"
                id="star-4"
            />
            <img
                src="/images/small-purple-star.svg"
                alt=""
                class="star"
                id="star-5"
            />
        </header>

        <main>
            {#each home.data.body as timelinePiece}
                <div class="step">
                    <p class="year">
                        {prismicH.asText(timelinePiece.primary.year)}
                    </p>
                    <div class="description">
                        {@html prismicH.asHTML(timelinePiece.primary.title)}
                    </div>

                    <div class="projects">
                        {#each timelinePiece.items as item}
                            <ProjectItem {item} {client} />
                        {/each}
                    </div>
                </div>
            {/each}
        </main>

        <footer>
            <img
                src="images/monogramme-blanc.png"
                alt="Monogramme en forme de visage avec un L et un M"
            />

            {@html prismicH.asHTML(home.data.footer)}
        </footer>
    {:catch error}
        <pre>{error.message}</pre>
    {/await}
</div>

<style type="text/scss">
    @import "../assets/styles/home.scss";
</style>
