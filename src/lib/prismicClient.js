import * as prismic from "@prismicio/client";

const repoName = "laura-munsch";
const accessToken =
    "MC5ZbktVSnhJQUFDTUFSNVN3.VT0vYiTvv73vv70IAe-_ve-_ve-_vVHvv73vv73vv73vv73vv70G77-977-9agkzIRrvv71_77-977-977-9LA";

const routes = [
    {
        type: "projects",
        path: "/projets/:uid",
    },
];

const createClient = (fetch) => {
    const clientOptions = {
        fetch,
        accessToken,
        routes,
    };
    const client = prismic.createClient(repoName, clientOptions);
    return client;
};

export default createClient;
