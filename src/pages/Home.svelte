<script>
    import createClient from '../lib/prismicClient';
    import  * as prismicH from "@prismicio/helpers";
    import Loader from "../components/Loader.svelte"
    import { Link } from "svelte-routing";
    import ASScroll from '@ashthornton/asscroll';
    
    // fetch the data
    const client = createClient();
    const prismicQuery = client.getSingle('home');
    
    async function loadProject(slug) {
        const response = await client.getByUID('projects', slug);
        return response;
    }

    // asscroll init
    let asscroll;
    let cssVar

    function initASScroll() {
        asscroll = new ASScroll();

        asscroll.enable({
            horizontalScroll: true
        });

        asscroll.on("scroll", (scrollPos) => {
            cssVar = `--scroll-pos:${scrollPos}px`; 
        })
    }
</script>

<div asscroll-container on:load="{initASScroll()}">
    <div class="scroll-ctn">

        {#await prismicQuery}
            <Loader />
        {:then home}

            <header>
                <h1 style="{cssVar}">
                    <span class="title">{prismicH.asText(home.data.title)}</span>
                    <span class="title-bis">{prismicH.asText(home.data.titlebis)}</span>
                </h1>

                <h2>{prismicH.asText(home.data.subtitle)}</h2>
            </header>

            <main>
                {#each home.data.body as timelinePiece}
                    <div class="project">
                        <p class="year">{prismicH.asText(timelinePiece.primary.year)}</p>
                        <div class="description">
                            {@html prismicH.asHTML(timelinePiece.primary.title)}
                        </div>

                        {#each timelinePiece.items as item}
                            {#if item.project.slug}

                                {#await loadProject(item.project.slug)}
                                    <Loader />
                                {:then project} 

                                    <Link to="{ project.url }">
                                        <img src="{ project.data.image.url }" alt="{ project.data.image.alt }" class="img-project">
                                    </Link>

                                {/await}

                            {/if}
                        {/each}
                    </div>
                {/each}
            </main>

        {:catch error}
            <pre>{error.message}</pre>
        {/await}
        
    </div>
</div>

<style type="text/scss">
    @import "../assets/styles/home.scss";
</style>