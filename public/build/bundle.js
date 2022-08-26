
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached if target is not <head>
        let children = target.childNodes;
        // If target is <head>, there may be children without claim_order
        if (target.nodeName === 'HEAD') {
            const myChildren = [];
            for (let i = 0; i < children.length; i++) {
                const node = children[i];
                if (node.claim_order !== undefined) {
                    myChildren.push(node);
                }
            }
            children = myChildren;
        }
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            // with fast path for when we are on the current longest subsequence
            const seqLen = ((longest > 0 && children[m[longest]].claim_order <= current) ? longest + 1 : upper_bound(1, longest, idx => children[m[idx]].claim_order, current)) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append_hydration(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            // Skip nodes of undefined ordering
            while ((target.actual_end_child !== null) && (target.actual_end_child.claim_order === undefined)) {
                target.actual_end_child = target.actual_end_child.nextSibling;
            }
            if (node !== target.actual_end_child) {
                // We only insert if the ordering of this node should be modified or the parent node is not target
                if (node.claim_order !== undefined || node.parentNode !== target) {
                    target.insertBefore(node, target.actual_end_child);
                }
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target || node.nextSibling !== null) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function insert_hydration(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append_hydration(target, node);
        }
        else if (node.parentNode !== target || node.nextSibling != anchor) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function init_claim_info(nodes) {
        if (nodes.claim_info === undefined) {
            nodes.claim_info = { last_index: 0, total_claimed: 0 };
        }
    }
    function claim_node(nodes, predicate, processNode, createNode, dontUpdateLastIndex = false) {
        // Try to find nodes in an order such that we lengthen the longest increasing subsequence
        init_claim_info(nodes);
        const resultNode = (() => {
            // We first try to find an element after the previous one
            for (let i = nodes.claim_info.last_index; i < nodes.length; i++) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    return node;
                }
            }
            // Otherwise, we try to find one before
            // We iterate in reverse so that we don't go too far back
            for (let i = nodes.claim_info.last_index - 1; i >= 0; i--) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    else if (replacement === undefined) {
                        // Since we spliced before the last_index, we decrease it
                        nodes.claim_info.last_index--;
                    }
                    return node;
                }
            }
            // If we can't find any matching node, we create a new one
            return createNode();
        })();
        resultNode.claim_order = nodes.claim_info.total_claimed;
        nodes.claim_info.total_claimed += 1;
        return resultNode;
    }
    function claim_element_base(nodes, name, attributes, create_element) {
        return claim_node(nodes, (node) => node.nodeName === name, (node) => {
            const remove = [];
            for (let j = 0; j < node.attributes.length; j++) {
                const attribute = node.attributes[j];
                if (!attributes[attribute.name]) {
                    remove.push(attribute.name);
                }
            }
            remove.forEach(v => node.removeAttribute(v));
            return undefined;
        }, () => create_element(name));
    }
    function claim_element(nodes, name, attributes) {
        return claim_element_base(nodes, name, attributes, element);
    }
    function claim_text(nodes, data) {
        return claim_node(nodes, (node) => node.nodeType === 3, (node) => {
            const dataStr = '' + data;
            if (node.data.startsWith(dataStr)) {
                if (node.data.length !== dataStr.length) {
                    return node.splitText(dataStr.length);
                }
            }
            else {
                node.data = dataStr;
            }
        }, () => text(data), true // Text nodes should not update last index since it is likely not worth it to eliminate an increasing subsequence of actual elements
        );
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function find_comment(nodes, text, start) {
        for (let i = start; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 8 /* comment node */ && node.textContent.trim() === text) {
                return i;
            }
        }
        return nodes.length;
    }
    function claim_html_tag(nodes, is_svg) {
        // find html opening tag
        const start_index = find_comment(nodes, 'HTML_TAG_START', 0);
        const end_index = find_comment(nodes, 'HTML_TAG_END', start_index);
        if (start_index === end_index) {
            return new HtmlTagHydration(undefined, is_svg);
        }
        init_claim_info(nodes);
        const html_tag_nodes = nodes.splice(start_index, end_index - start_index + 1);
        detach(html_tag_nodes[0]);
        detach(html_tag_nodes[html_tag_nodes.length - 1]);
        const claimed_nodes = html_tag_nodes.slice(1, html_tag_nodes.length - 1);
        for (const n of claimed_nodes) {
            n.claim_order = nodes.claim_info.total_claimed;
            nodes.claim_info.total_claimed += 1;
        }
        return new HtmlTagHydration(claimed_nodes, is_svg);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    class HtmlTag {
        constructor(is_svg = false) {
            this.is_svg = false;
            this.is_svg = is_svg;
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                if (this.is_svg)
                    this.e = svg_element(target.nodeName);
                else
                    this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }
    class HtmlTagHydration extends HtmlTag {
        constructor(claimed_nodes, is_svg = false) {
            super(is_svg);
            this.e = this.n = null;
            this.l = claimed_nodes;
        }
        c(html) {
            if (this.l) {
                this.n = this.l;
            }
            else {
                super.c(html);
            }
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert_hydration(this.t, this.n[i], anchor);
            }
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
        return context;
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_hydration_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append_hydration(target, node);
    }
    function insert_hydration_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert_hydration(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    function hostMatches(anchor) {
      const host = location.host;
      return (
        anchor.host == host ||
        // svelte seems to kill anchor.host value in ie11, so fall back to checking href
        anchor.href.indexOf(`https://${host}`) === 0 ||
        anchor.href.indexOf(`http://${host}`) === 0
      )
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.48.0 */

    function create_fragment$7(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $location;
    	let $routes;
    	let $base;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, ['default']);
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, 'routes');
    	component_subscribe($$self, routes, value => $$invalidate(6, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(5, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, 'base');
    	component_subscribe($$self, base, value => $$invalidate(7, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ['basepath', 'url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$location,
    		$routes,
    		$base
    	});

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 128) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			{
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 96) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			{
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		$location,
    		$routes,
    		$base,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.48.0 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 4,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[2],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_hydration_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, routeParams, $location*/ 532)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1$2(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[2],
    		/*routeProps*/ ctx[3]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_hydration_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 28)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
    					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_hydration_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Route', slots, ['default']);
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, 'activeRoute');
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('path' in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$props) $$invalidate(0, component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate(2, routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate(3, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 2) {
    			if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(2, routeParams = $activeRoute.params);
    			}
    		}

    		{
    			const { path, component, ...rest } = $$props;
    			$$invalidate(3, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		$activeRoute,
    		routeParams,
    		routeProps,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.48.0 */
    const file$5 = "node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$5(ctx) {
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	let a_levels = [
    		{ href: /*href*/ ctx[0] },
    		{ "aria-current": /*ariaCurrent*/ ctx[2] },
    		/*props*/ ctx[1],
    		/*$$restProps*/ ctx[6]
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			a = claim_element(nodes, "A", { href: true, "aria-current": true });
    			var a_nodes = children(a);
    			if (default_slot) default_slot.l(a_nodes);
    			a_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			set_attributes(a, a_data);
    			add_location(a, file$5, 40, 0, 1249);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*onClick*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null),
    						null
    					);
    				}
    			}

    			set_attributes(a, a_data = get_spread_update(a_levels, [
    				(!current || dirty & /*href*/ 1) && { href: /*href*/ ctx[0] },
    				(!current || dirty & /*ariaCurrent*/ 4) && { "aria-current": /*ariaCurrent*/ ctx[2] },
    				dirty & /*props*/ 2 && /*props*/ ctx[1],
    				dirty & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6]
    			]));
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let ariaCurrent;
    	const omit_props_names = ["to","replace","state","getProps"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $location;
    	let $base;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Link', slots, ['default']);
    	let { to = "#" } = $$props;
    	let { replace = false } = $$props;
    	let { state = {} } = $$props;
    	let { getProps = () => ({}) } = $$props;
    	const { base } = getContext(ROUTER);
    	validate_store(base, 'base');
    	component_subscribe($$self, base, value => $$invalidate(14, $base = value));
    	const location = getContext(LOCATION);
    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(13, $location = value));
    	const dispatch = createEventDispatcher();
    	let href, isPartiallyCurrent, isCurrent, props;

    	function onClick(event) {
    		dispatch("click", event);

    		if (shouldNavigate(event)) {
    			event.preventDefault();

    			// Don't push another entry to the history stack when the user
    			// clicks on a Link to the page they are currently on.
    			const shouldReplace = $location.pathname === href || replace;

    			navigate(href, { state, replace: shouldReplace });
    		}
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ('to' in $$new_props) $$invalidate(7, to = $$new_props.to);
    		if ('replace' in $$new_props) $$invalidate(8, replace = $$new_props.replace);
    		if ('state' in $$new_props) $$invalidate(9, state = $$new_props.state);
    		if ('getProps' in $$new_props) $$invalidate(10, getProps = $$new_props.getProps);
    		if ('$$scope' in $$new_props) $$invalidate(15, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		createEventDispatcher,
    		ROUTER,
    		LOCATION,
    		navigate,
    		startsWith,
    		resolve,
    		shouldNavigate,
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		dispatch,
    		href,
    		isPartiallyCurrent,
    		isCurrent,
    		props,
    		onClick,
    		ariaCurrent,
    		$location,
    		$base
    	});

    	$$self.$inject_state = $$new_props => {
    		if ('to' in $$props) $$invalidate(7, to = $$new_props.to);
    		if ('replace' in $$props) $$invalidate(8, replace = $$new_props.replace);
    		if ('state' in $$props) $$invalidate(9, state = $$new_props.state);
    		if ('getProps' in $$props) $$invalidate(10, getProps = $$new_props.getProps);
    		if ('href' in $$props) $$invalidate(0, href = $$new_props.href);
    		if ('isPartiallyCurrent' in $$props) $$invalidate(11, isPartiallyCurrent = $$new_props.isPartiallyCurrent);
    		if ('isCurrent' in $$props) $$invalidate(12, isCurrent = $$new_props.isCurrent);
    		if ('props' in $$props) $$invalidate(1, props = $$new_props.props);
    		if ('ariaCurrent' in $$props) $$invalidate(2, ariaCurrent = $$new_props.ariaCurrent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*to, $base*/ 16512) {
    			$$invalidate(0, href = to === "/" ? $base.uri : resolve(to, $base.uri));
    		}

    		if ($$self.$$.dirty & /*$location, href*/ 8193) {
    			$$invalidate(11, isPartiallyCurrent = startsWith($location.pathname, href));
    		}

    		if ($$self.$$.dirty & /*href, $location*/ 8193) {
    			$$invalidate(12, isCurrent = href === $location.pathname);
    		}

    		if ($$self.$$.dirty & /*isCurrent*/ 4096) {
    			$$invalidate(2, ariaCurrent = isCurrent ? "page" : undefined);
    		}

    		if ($$self.$$.dirty & /*getProps, $location, href, isPartiallyCurrent, isCurrent*/ 15361) {
    			$$invalidate(1, props = getProps({
    				location: $location,
    				href,
    				isPartiallyCurrent,
    				isCurrent
    			}));
    		}
    	};

    	return [
    		href,
    		props,
    		ariaCurrent,
    		base,
    		location,
    		onClick,
    		$$restProps,
    		to,
    		replace,
    		state,
    		getProps,
    		isPartiallyCurrent,
    		isCurrent,
    		$location,
    		$base,
    		$$scope,
    		slots
    	];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			to: 7,
    			replace: 8,
    			state: 9,
    			getProps: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * A link action that can be added to <a href=""> tags rather
     * than using the <Link> component.
     *
     * Example:
     * ```html
     * <a href="/post/{postId}" use:link>{post.title}</a>
     * ```
     */
    function link$1(node) {
      function onClick(event) {
        const anchor = event.currentTarget;

        if (
          anchor.target === "" &&
          hostMatches(anchor) &&
          shouldNavigate(event)
        ) {
          event.preventDefault();
          navigate(anchor.pathname + anchor.search, { replace: anchor.hasAttribute("replace") });
        }
      }

      node.addEventListener("click", onClick);

      return {
        destroy() {
          node.removeEventListener("click", onClick);
        }
      };
    }

    const RichTextNodeType = {
      heading1: "heading1",
      heading2: "heading2",
      heading3: "heading3",
      heading4: "heading4",
      heading5: "heading5",
      heading6: "heading6",
      paragraph: "paragraph",
      preformatted: "preformatted",
      strong: "strong",
      em: "em",
      listItem: "list-item",
      oListItem: "o-list-item",
      list: "group-list-item",
      oList: "group-o-list-item",
      image: "image",
      embed: "embed",
      hyperlink: "hyperlink",
      label: "label",
      span: "span"
    };
    const LinkType = {
      Any: "Any",
      Document: "Document",
      Media: "Media",
      Web: "Web"
    };

    const uuid = () => {
      return (++uuid.i).toString();
    };
    uuid.i = 0;
    const asTree = (nodes) => {
      const preparedNodes = prepareNodes(nodes);
      const children = [];
      for (let i = 0; i < preparedNodes.length; i++) {
        children.push(nodeToTreeNode(preparedNodes[i]));
      }
      return {
        key: uuid(),
        children
      };
    };
    const createTreeNode = (node, children = []) => {
      return {
        key: uuid(),
        type: node.type,
        text: "text" in node ? node.text : void 0,
        node,
        children
      };
    };
    const createTextTreeNode = (text) => {
      return createTreeNode({
        type: RichTextNodeType.span,
        text,
        spans: []
      });
    };
    const prepareNodes = (nodes) => {
      const mutNodes = nodes.slice(0);
      for (let i = 0; i < mutNodes.length; i++) {
        const node = mutNodes[i];
        if (node.type === RichTextNodeType.listItem || node.type === RichTextNodeType.oListItem) {
          const items = [
            node
          ];
          while (mutNodes[i + 1] && mutNodes[i + 1].type === node.type) {
            items.push(mutNodes[i + 1]);
            mutNodes.splice(i, 1);
          }
          if (node.type === RichTextNodeType.listItem) {
            mutNodes[i] = {
              type: RichTextNodeType.list,
              items
            };
          } else {
            mutNodes[i] = {
              type: RichTextNodeType.oList,
              items
            };
          }
        }
      }
      return mutNodes;
    };
    const nodeToTreeNode = (node) => {
      if ("text" in node) {
        return createTreeNode(node, textNodeSpansToTreeNodeChildren(node.spans, node));
      }
      if ("items" in node) {
        const children = [];
        for (let i = 0; i < node.items.length; i++) {
          children.push(nodeToTreeNode(node.items[i]));
        }
        return createTreeNode(node, children);
      }
      return createTreeNode(node);
    };
    const textNodeSpansToTreeNodeChildren = (spans, node, parentSpan) => {
      if (!spans.length) {
        return [createTextTreeNode(node.text)];
      }
      const mutSpans = spans.slice(0);
      mutSpans.sort((a, b) => a.start - b.start || b.end - a.end);
      const children = [];
      for (let i = 0; i < mutSpans.length; i++) {
        const span = mutSpans[i];
        const parentSpanStart = parentSpan && parentSpan.start || 0;
        const spanStart = span.start - parentSpanStart;
        const spanEnd = span.end - parentSpanStart;
        const childSpans = [];
        for (let j = i; j < mutSpans.length; j++) {
          const siblingSpan = mutSpans[j];
          if (siblingSpan !== span && siblingSpan.start >= span.start && siblingSpan.end <= span.end) {
            childSpans.push(siblingSpan);
            mutSpans.splice(j, 1);
            j--;
          }
        }
        if (i === 0 && spanStart > 0) {
          children.push(createTextTreeNode(node.text.slice(0, spanStart)));
        }
        children.push(createTreeNode(span, textNodeSpansToTreeNodeChildren(childSpans, {
          ...node,
          text: node.text.slice(spanStart, spanEnd)
        }, span)));
        if (spanEnd < node.text.length) {
          children.push(createTextTreeNode(node.text.slice(spanEnd, mutSpans[i + 1] ? mutSpans[i + 1].start - parentSpanStart : void 0)));
        }
      }
      return children;
    };

    const asText$1 = (richTextField, separator = " ") => {
      let result = "";
      for (let i = 0; i < richTextField.length; i++) {
        if ("text" in richTextField[i]) {
          result += (result ? separator : "") + richTextField[i].text;
        }
      }
      return result;
    };

    const serialize = (richTextField, serializer) => {
      return serializeTreeNodes(asTree(richTextField).children, serializer);
    };
    const serializeTreeNodes = (nodes, serializer) => {
      const serializedTreeNodes = [];
      for (let i = 0; i < nodes.length; i++) {
        const treeNode = nodes[i];
        const serializedTreeNode = serializer(treeNode.type, treeNode.node, treeNode.text, serializeTreeNodes(treeNode.children, serializer), treeNode.key);
        if (serializedTreeNode != null) {
          serializedTreeNodes.push(serializedTreeNode);
        }
      }
      return serializedTreeNodes;
    };

    const RichTextReversedNodeType = {
      [RichTextNodeType.listItem]: "listItem",
      [RichTextNodeType.oListItem]: "oListItem",
      [RichTextNodeType.list]: "list",
      [RichTextNodeType.oList]: "oList"
    };

    const wrapMapSerializer = (mapSerializer) => {
      return (type, node, text, children, key) => {
        const tagSerializer = mapSerializer[RichTextReversedNodeType[type] || type];
        if (tagSerializer) {
          return tagSerializer({
            type,
            node,
            text,
            children,
            key
          });
        }
      };
    };

    const composeSerializers = (...serializers) => {
      return (...args) => {
        for (let i = 0; i < serializers.length; i++) {
          const serializer = serializers[i];
          if (serializer) {
            const res = serializer(...args);
            if (res != null) {
              return res;
            }
          }
        }
      };
    };

    /*!
     * escape-html
     * Copyright(c) 2012-2013 TJ Holowaychuk
     * Copyright(c) 2015 Andreas Lubbe
     * Copyright(c) 2015 Tiancheng "Timothy" Gu
     * MIT Licensed
     */

    /**
     * Module variables.
     * @private
     */

    var matchHtmlRegExp = /["'&<>]/;

    /**
     * Module exports.
     * @public
     */

    var escapeHtml_1 = escapeHtml;

    /**
     * Escape special characters in the given string of html.
     *
     * @param  {string} string The string to escape for inserting into HTML
     * @return {string}
     * @public
     */

    function escapeHtml(string) {
      var str = '' + string;
      var match = matchHtmlRegExp.exec(str);

      if (!match) {
        return str;
      }

      var escape;
      var html = '';
      var index = 0;
      var lastIndex = 0;

      for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
          case 34: // "
            escape = '&quot;';
            break;
          case 38: // &
            escape = '&amp;';
            break;
          case 39: // '
            escape = '&#39;';
            break;
          case 60: // <
            escape = '&lt;';
            break;
          case 62: // >
            escape = '&gt;';
            break;
          default:
            continue;
        }

        if (lastIndex !== index) {
          html += str.substring(lastIndex, index);
        }

        lastIndex = index + 1;
        html += escape;
      }

      return lastIndex !== index
        ? html + str.substring(lastIndex, index)
        : html;
    }

    const camelCaseToParamCase = (input) => {
      return input.replace(/[A-Z]/g, (match) => {
        return `-${match.toLowerCase()}`;
      });
    };
    const buildURL = (url, params) => {
      const instance = new URL(url);
      for (const camelCasedParamKey in params) {
        const paramKey = camelCaseToParamCase(camelCasedParamKey);
        const paramValue = params[camelCasedParamKey];
        if (paramValue === void 0) {
          instance.searchParams.delete(paramKey);
        } else if (Array.isArray(paramValue)) {
          instance.searchParams.set(paramKey, paramValue.join(","));
        } else {
          instance.searchParams.set(paramKey, `${paramValue}`);
        }
      }
      const s = instance.searchParams.get("s");
      if (s) {
        instance.searchParams.delete("s");
        instance.searchParams.append("s", s);
      }
      return instance.toString();
    };

    const buildPixelDensitySrcSet = (url, { pixelDensities, ...params }) => {
      return pixelDensities.map((dpr) => {
        return `${buildURL(url, { ...params, dpr })} ${dpr}x`;
      }).join(", ");
    };

    const buildWidthSrcSet = (url, { widths, ...params }) => {
      return widths.map((width) => {
        return `${buildURL(url, { ...params, w: void 0, width })} ${width}w`;
      }).join(", ");
    };

    const asDate = (dateOrTimestampField) => {
      if (!dateOrTimestampField) {
        return null;
      }
      if (dateOrTimestampField.length === 24) {
        return new Date(dateOrTimestampField.replace(/(\+|-)(\d{2})(\d{2})$/, ".000$1$2:$3"));
      } else {
        return new Date(dateOrTimestampField);
      }
    };

    const documentToLinkField = (prismicDocument) => {
      var _a, _b, _c;
      return {
        link_type: LinkType.Document,
        id: prismicDocument.id,
        uid: (_a = prismicDocument.uid) != null ? _a : void 0,
        type: prismicDocument.type,
        tags: prismicDocument.tags,
        lang: prismicDocument.lang,
        url: (_b = prismicDocument.url) != null ? _b : void 0,
        slug: (_c = prismicDocument.slugs) == null ? void 0 : _c[0],
        ...Object.keys(prismicDocument.data).length > 0 ? { data: prismicDocument.data } : {}
      };
    };

    const asLink = (linkFieldOrDocument, linkResolver) => {
      if (!linkFieldOrDocument) {
        return null;
      }
      const linkField = "link_type" in linkFieldOrDocument ? linkFieldOrDocument : documentToLinkField(linkFieldOrDocument);
      switch (linkField.link_type) {
        case LinkType.Media:
        case LinkType.Web:
          return "url" in linkField ? linkField.url : null;
        case LinkType.Document: {
          if ("id" in linkField && linkResolver) {
            const resolvedURL = linkResolver(linkField);
            if (resolvedURL != null) {
              return resolvedURL;
            }
          }
          if ("url" in linkField && linkField.url) {
            return linkField.url;
          }
          return null;
        }
        case LinkType.Any:
        default:
          return null;
      }
    };

    const asText = (richTextField, separator) => {
      if (richTextField) {
        return asText$1(richTextField, separator);
      } else {
        return null;
      }
    };

    const getLabel = (node) => {
      return "data" in node && "label" in node.data ? ` class="${node.data.label}"` : "";
    };
    const serializeStandardTag = (tag, node, children) => {
      return `<${tag}${getLabel(node)}>${children.join("")}</${tag}>`;
    };
    const serializePreFormatted = (node) => {
      return `<pre${getLabel(node)}>${escapeHtml_1(node.text)}</pre>`;
    };
    const serializeImage = (linkResolver, node) => {
      let imageTag = `<img src="${node.url}" alt="${escapeHtml_1(node.alt)}"${node.copyright ? ` copyright="${escapeHtml_1(node.copyright)}"` : ""} />`;
      if (node.linkTo) {
        imageTag = serializeHyperlink(linkResolver, {
          type: RichTextNodeType.hyperlink,
          data: node.linkTo,
          start: 0,
          end: 0
        }, [imageTag]);
      }
      return `<p class="block-img">${imageTag}</p>`;
    };
    const serializeEmbed = (node) => {
      return `<div data-oembed="${node.oembed.embed_url}" data-oembed-type="${node.oembed.type}" data-oembed-provider="${node.oembed.provider_name}"${getLabel(node)}>${node.oembed.html}</div>`;
    };
    const serializeHyperlink = (linkResolver, node, children) => {
      switch (node.data.link_type) {
        case LinkType.Web: {
          return `<a href="${escapeHtml_1(node.data.url)}" target="${node.data.target}" rel="noopener noreferrer"${getLabel(node)}>${children.join("")}</a>`;
        }
        case LinkType.Document: {
          return `<a href="${asLink(node.data, linkResolver)}"${getLabel(node)}>${children.join("")}</a>`;
        }
        case LinkType.Media: {
          return `<a href="${node.data.url}"${getLabel(node)}>${children.join("")}</a>`;
        }
      }
    };
    const serializeSpan = (content) => {
      return content ? escapeHtml_1(content).replace(/\n/g, "<br />") : "";
    };

    const createDefaultHTMLSerializer = (linkResolver) => {
      return (_type, node, text, children, _key) => {
        switch (node.type) {
          case RichTextNodeType.heading1:
            return serializeStandardTag("h1", node, children);
          case RichTextNodeType.heading2:
            return serializeStandardTag("h2", node, children);
          case RichTextNodeType.heading3:
            return serializeStandardTag("h3", node, children);
          case RichTextNodeType.heading4:
            return serializeStandardTag("h4", node, children);
          case RichTextNodeType.heading5:
            return serializeStandardTag("h5", node, children);
          case RichTextNodeType.heading6:
            return serializeStandardTag("h6", node, children);
          case RichTextNodeType.paragraph:
            return serializeStandardTag("p", node, children);
          case RichTextNodeType.preformatted:
            return serializePreFormatted(node);
          case RichTextNodeType.strong:
            return serializeStandardTag("strong", node, children);
          case RichTextNodeType.em:
            return serializeStandardTag("em", node, children);
          case RichTextNodeType.listItem:
            return serializeStandardTag("li", node, children);
          case RichTextNodeType.oListItem:
            return serializeStandardTag("li", node, children);
          case RichTextNodeType.list:
            return serializeStandardTag("ul", node, children);
          case RichTextNodeType.oList:
            return serializeStandardTag("ol", node, children);
          case RichTextNodeType.image:
            return serializeImage(linkResolver, node);
          case RichTextNodeType.embed:
            return serializeEmbed(node);
          case RichTextNodeType.hyperlink:
            return serializeHyperlink(linkResolver, node, children);
          case RichTextNodeType.label:
            return serializeStandardTag("span", node, children);
          case RichTextNodeType.span:
          default:
            return serializeSpan(text);
        }
      };
    };
    const wrapMapSerializerWithStringChildren = (mapSerializer) => {
      const modifiedMapSerializer = {};
      for (const tag in mapSerializer) {
        const tagSerializer = mapSerializer[tag];
        if (tagSerializer) {
          modifiedMapSerializer[tag] = (payload) => {
            return tagSerializer({
              ...payload,
              children: payload.children.join("")
            });
          };
        }
      }
      return wrapMapSerializer(modifiedMapSerializer);
    };
    const asHTML = (richTextField, linkResolver, htmlSerializer) => {
      if (richTextField) {
        let serializer;
        if (htmlSerializer) {
          serializer = composeSerializers(typeof htmlSerializer === "object" ? wrapMapSerializerWithStringChildren(htmlSerializer) : (type, node, text, children, key) => htmlSerializer(type, node, text, children.join(""), key), createDefaultHTMLSerializer(linkResolver));
        } else {
          serializer = createDefaultHTMLSerializer(linkResolver);
        }
        return serialize(richTextField, serializer).join("");
      } else {
        return null;
      }
    };

    const isNonNullish = (input) => {
      return input != null;
    };
    const isNonEmptyArray = (input) => {
      return !!input.length;
    };
    const richText = (field) => {
      if (!isNonNullish(field)) {
        return false;
      } else if (field.length === 1 && "text" in field[0]) {
        return !!field[0].text;
      } else {
        return !!field.length;
      }
    };
    const title = richText;
    const imageThumbnail = (thumbnail) => {
      return isNonNullish(thumbnail) && !!thumbnail.url;
    };
    const image = imageThumbnail;
    const link = (field) => {
      return isNonNullish(field) && ("id" in field || "url" in field);
    };
    const linkToMedia = link;
    const contentRelationship = link;
    const date = isNonNullish;
    const timestamp = isNonNullish;
    const color = isNonNullish;
    const number = isNonNullish;
    const keyText = (field) => {
      return isNonNullish(keyText) && !!field;
    };
    const select = isNonNullish;
    const embed = (field) => {
      return isNonNullish(field) && !!field.embed_url;
    };
    const geoPoint = (field) => {
      return isNonNullish(field) && "longitude" in field;
    };
    const integrationFields = isNonNullish;
    const group = (group2) => {
      return isNonNullish(group2) && isNonEmptyArray(group2);
    };
    const sliceZone = (slices) => {
      return isNonNullish(slices) && isNonEmptyArray(slices);
    };

    var isFilled = /*#__PURE__*/Object.freeze({
    	__proto__: null,
    	richText: richText,
    	title: title,
    	imageThumbnail: imageThumbnail,
    	image: image,
    	link: link,
    	linkToMedia: linkToMedia,
    	contentRelationship: contentRelationship,
    	date: date,
    	timestamp: timestamp,
    	color: color,
    	number: number,
    	keyText: keyText,
    	select: select,
    	embed: embed,
    	geoPoint: geoPoint,
    	integrationFields: integrationFields,
    	group: group,
    	sliceZone: sliceZone
    });

    const asImageSrc = (field, params = {}) => {
      if (field && imageThumbnail(field)) {
        return buildURL(field.url, params);
      } else {
        return null;
      }
    };

    const DEFAULT_WIDTHS = [640, 828, 1200, 2048, 3840];
    const asImageWidthSrcSet = (field, params = {}) => {
      if (field && imageThumbnail(field)) {
        let {
          widths = DEFAULT_WIDTHS,
          ...imgixParams
        } = params;
        const {
          url,
          dimensions,
          alt: _alt,
          copyright: _copyright,
          ...responsiveViews
        } = field;
        const responsiveViewObjects = Object.values(responsiveViews);
        if (widths === "thumbnails" && responsiveViewObjects.length < 1) {
          widths = DEFAULT_WIDTHS;
        }
        return {
          src: buildURL(url, imgixParams),
          srcset: widths === "thumbnails" ? [
            buildWidthSrcSet(url, {
              ...imgixParams,
              widths: [dimensions.width]
            }),
            ...responsiveViewObjects.map((thumbnail) => {
              return buildWidthSrcSet(thumbnail.url, {
                ...imgixParams,
                widths: [thumbnail.dimensions.width]
              });
            })
          ].join(", ") : buildWidthSrcSet(field.url, {
            ...imgixParams,
            widths
          })
        };
      } else {
        return null;
      }
    };

    const DEFAULT_PIXEL_DENSITIES = [1, 2, 3];
    const asImagePixelDensitySrcSet = (field, params = {}) => {
      if (field && imageThumbnail(field)) {
        const { pixelDensities = DEFAULT_PIXEL_DENSITIES, ...imgixParams } = params;
        return {
          src: buildURL(field.url, imgixParams),
          srcset: buildPixelDensitySrcSet(field.url, {
            ...imgixParams,
            pixelDensities
          })
        };
      } else {
        return null;
      }
    };

    const Elements = RichTextNodeType;

    var prismicH = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Elements: Elements,
        asDate: asDate,
        asHTML: asHTML,
        asImagePixelDensitySrcSet: asImagePixelDensitySrcSet,
        asImageSrc: asImageSrc,
        asImageWidthSrcSet: asImageWidthSrcSet,
        asLink: asLink,
        asText: asText,
        documentToLinkField: documentToLinkField,
        isFilled: isFilled,
        Element: RichTextNodeType
    });

    const isRepositoryName = (input) => {
      return /^[a-zA-Z0-9][-a-zA-Z0-9]{2,}[a-zA-Z0-9]$/.test(input);
    };

    class PrismicError extends Error {
      constructor(message = "An invalid API response was returned", url, response) {
        super(message);
        this.url = url;
        this.response = response;
      }
    }

    const getRepositoryEndpoint = (repositoryName) => {
      if (isRepositoryName(repositoryName)) {
        return `https://${repositoryName}.cdn.prismic.io/api/v2`;
      } else {
        throw new PrismicError(`An invalid Prismic repository name was given: ${repositoryName}`, void 0, void 0);
      }
    };

    const isRepositoryEndpoint = (input) => {
      try {
        new URL(input);
        return true;
      } catch (e) {
        return false;
      }
    };

    const castArray = (a) => Array.isArray(a) ? a : [a];

    const RENAMED_PARAMS = {
      accessToken: "access_token"
    };
    const castOrderingToString = (ordering) => typeof ordering === "string" ? ordering : [
      ordering.field,
      ordering.direction === "desc" ? ordering.direction : void 0
    ].filter(Boolean).join(" ");
    const buildQueryURL = (endpoint, args) => {
      var _a;
      const { predicates, ...params } = args;
      const url = new URL(`documents/search`, `${endpoint}/`);
      if (predicates) {
        for (const predicate of castArray(predicates)) {
          url.searchParams.append("q", `[${predicate}]`);
        }
      }
      for (const k in params) {
        const name = (_a = RENAMED_PARAMS[k]) != null ? _a : k;
        let value = params[k];
        if (name === "orderings") {
          const scopedValue = params[name];
          if (scopedValue != null) {
            const v = castArray(scopedValue).map((ordering) => castOrderingToString(ordering)).join(",");
            value = `[${v}]`;
          }
        } else if (name === "routes") {
          if (typeof params[name] === "object") {
            value = JSON.stringify(castArray(params[name]));
          }
        }
        if (value != null) {
          url.searchParams.set(name, castArray(value).join(","));
        }
      }
      return url.toString();
    };

    const appendPredicates = (objWithPredicates = {}, predicates) => {
      return {
        ...objWithPredicates,
        predicates: [
          ...objWithPredicates.predicates || [],
          ...castArray(predicates)
        ]
      };
    };

    const castThunk = (a) => typeof a === "function" ? a : () => a;

    const findRef = (refs, predicate) => {
      const ref = refs.find((ref2) => predicate(ref2));
      if (!ref) {
        throw new PrismicError("Ref could not be found.", void 0, void 0);
      }
      return ref;
    };

    const findMasterRef = (refs) => {
      return findRef(refs, (ref) => ref.isMasterRef);
    };

    const findRefByID = (refs, id) => {
      return findRef(refs, (ref) => ref.id === id);
    };

    const findRefByLabel = (refs, label) => {
      return findRef(refs, (ref) => ref.label === label);
    };

    const readValue = (value) => {
      return value.replace(/%3B/g, ";");
    };
    const parse = (cookieString) => {
      const result = {};
      const cookies = cookieString.split("; ");
      for (const cookie of cookies) {
        const parts = cookie.split("=");
        const value = parts.slice(1).join("=");
        const name = readValue(parts[0]).replace(/%3D/g, "=");
        result[name] = readValue(value);
      }
      return result;
    };
    const getAll = (cookieStore) => parse(cookieStore);
    const getCookie = (name, cookieStore) => getAll(cookieStore)[name];

    const minifyGraphQLQuery = (query) => {
      return query.replace(/(\n| )*( |{|})(\n| )*/gm, (_chars, _spaces, brackets) => brackets);
    };

    const preview = "io.prismic.preview";

    class ForbiddenError extends PrismicError {
    }

    class NotFoundError extends PrismicError {
    }

    class ParsingError extends PrismicError {
    }

    const formatValue = (value) => {
      if (Array.isArray(value)) {
        return `[${value.map(formatValue).join(", ")}]`;
      }
      if (typeof value === "string") {
        return `"${value}"`;
      }
      if (value instanceof Date) {
        return `${value.getTime()}`;
      }
      return `${value}`;
    };
    const pathWithArgsPredicate = (name) => {
      const fn = (path, ...args) => {
        const formattedArgs = args.map(formatValue).join(", ");
        const joiner = path && args.length ? ", " : "";
        return `[${name}(${path}${joiner}${formattedArgs})]`;
      };
      return fn;
    };
    const pathPredicate = (name) => {
      const predicateFn = pathWithArgsPredicate(name);
      const fn = (path) => {
        return predicateFn(path);
      };
      return fn;
    };
    const argsPredicate = (name) => {
      const predicateFn = pathWithArgsPredicate(name);
      const fn = (...args) => {
        return predicateFn("", ...args);
      };
      return fn;
    };
    const predicate = {
      at: pathWithArgsPredicate("at"),
      not: pathWithArgsPredicate("not"),
      any: pathWithArgsPredicate("any"),
      in: pathWithArgsPredicate("in"),
      fulltext: pathWithArgsPredicate("fulltext"),
      has: pathPredicate("has"),
      missing: pathPredicate("missing"),
      similar: argsPredicate("similar"),
      geopointNear: pathWithArgsPredicate("geopoint.near"),
      numberLessThan: pathWithArgsPredicate("number.lt"),
      numberGreaterThan: pathWithArgsPredicate("number.gt"),
      numberInRange: pathWithArgsPredicate("number.inRange"),
      dateAfter: pathWithArgsPredicate("date.after"),
      dateBefore: pathWithArgsPredicate("date.before"),
      dateBetween: pathWithArgsPredicate("date.between"),
      dateDayOfMonth: pathWithArgsPredicate("date.day-of-month"),
      dateDayOfMonthAfter: pathWithArgsPredicate("date.day-of-month-after"),
      dateDayOfMonthBefore: pathWithArgsPredicate("date.day-of-month-before"),
      dateDayOfWeek: pathWithArgsPredicate("date.day-of-week"),
      dateDayOfWeekAfter: pathWithArgsPredicate("date.day-of-week-after"),
      dateDayOfWeekBefore: pathWithArgsPredicate("date.day-of-week-before"),
      dateMonth: pathWithArgsPredicate("date.month"),
      dateMonthAfter: pathWithArgsPredicate("date.month-after"),
      dateMonthBefore: pathWithArgsPredicate("date.month-before"),
      dateYear: pathWithArgsPredicate("date.year"),
      dateHour: pathWithArgsPredicate("date.hour"),
      dateHourAfter: pathWithArgsPredicate("date.hour-after"),
      dateHourBefore: pathWithArgsPredicate("date.hour-before")
    };

    const MAX_PAGE_SIZE = 100;
    const REPOSITORY_CACHE_TTL = 5e3;
    const GET_ALL_QUERY_DELAY = 500;
    const typePredicate = (documentType) => predicate.at("document.type", documentType);
    const everyTagPredicate = (tags) => predicate.at("document.tags", castArray(tags));
    const someTagsPredicate = (tags) => predicate.any("document.tags", castArray(tags));
    const createClient$1 = (...args) => new Client(...args);
    class Client {
      constructor(repositoryNameOrEndpoint, options = {}) {
        this.refState = {
          mode: "Master" /* Master */,
          autoPreviewsEnabled: true
        };
        this.cachedRepositoryExpiration = 0;
        this.graphqlFetch = this.graphQLFetch.bind(this);
        if (isRepositoryEndpoint(repositoryNameOrEndpoint)) {
          if (process.env.NODE_ENV === "development" && /\.prismic\.io\/(?!api\/v2\/?)/.test(repositoryNameOrEndpoint)) {
            throw new PrismicError("@prismicio/client only supports Prismic Rest API V2. Please provide only the repository name to the first createClient() parameter or use the getRepositoryEndpoint() helper to generate a valid Rest API V2 endpoint URL.", void 0, void 0);
          }
          this.endpoint = repositoryNameOrEndpoint;
        } else {
          this.endpoint = getRepositoryEndpoint(repositoryNameOrEndpoint);
        }
        this.accessToken = options.accessToken;
        this.routes = options.routes;
        this.defaultParams = options.defaultParams;
        if (options.ref) {
          this.queryContentFromRef(options.ref);
        }
        if (typeof options.fetch === "function") {
          this.fetchFn = options.fetch;
        } else if (typeof globalThis.fetch === "function") {
          this.fetchFn = globalThis.fetch;
        } else {
          throw new PrismicError("A valid fetch implementation was not provided. In environments where fetch is not available (including Node.js), a fetch implementation must be provided via a polyfill or the `fetch` option.", void 0, void 0);
        }
        if (this.fetchFn === globalThis.fetch) {
          this.fetchFn = this.fetchFn.bind(globalThis);
        }
        this.graphQLFetch = this.graphQLFetch.bind(this);
      }
      enableAutoPreviews() {
        this.refState.autoPreviewsEnabled = true;
      }
      enableAutoPreviewsFromReq(req) {
        this.refState.httpRequest = req;
        this.refState.autoPreviewsEnabled = true;
      }
      disableAutoPreviews() {
        this.refState.autoPreviewsEnabled = false;
      }
      async query(predicates, params) {
        const url = await this.buildQueryURL({ ...params, predicates });
        return await this.fetch(url, params);
      }
      async get(params) {
        const url = await this.buildQueryURL(params);
        return await this.fetch(url, params);
      }
      async getFirst(params) {
        const url = await this.buildQueryURL(params);
        const result = await this.fetch(url, params);
        const firstResult = result.results[0];
        if (firstResult) {
          return firstResult;
        }
        throw new PrismicError("No documents were returned", url, void 0);
      }
      async dangerouslyGetAll(params = {}) {
        var _a;
        const { limit = Infinity, ...actualParams } = params;
        const resolvedParams = {
          ...actualParams,
          pageSize: Math.min(limit, actualParams.pageSize || ((_a = this.defaultParams) == null ? void 0 : _a.pageSize) || MAX_PAGE_SIZE)
        };
        const documents = [];
        let latestResult;
        while ((!latestResult || latestResult.next_page) && documents.length < limit) {
          const page = latestResult ? latestResult.page + 1 : void 0;
          latestResult = await this.get({ ...resolvedParams, page });
          documents.push(...latestResult.results);
          if (latestResult.next_page) {
            await new Promise((res) => setTimeout(res, GET_ALL_QUERY_DELAY));
          }
        }
        return documents.slice(0, limit);
      }
      async getByID(id, params) {
        return await this.getFirst(appendPredicates(params, predicate.at("document.id", id)));
      }
      async getByIDs(ids, params) {
        return await this.get(appendPredicates(params, predicate.in("document.id", ids)));
      }
      async getAllByIDs(ids, params) {
        return await this.dangerouslyGetAll(appendPredicates(params, predicate.in("document.id", ids)));
      }
      async getByUID(documentType, uid, params) {
        return await this.getFirst(appendPredicates(params, [
          typePredicate(documentType),
          predicate.at(`my.${documentType}.uid`, uid)
        ]));
      }
      async getByUIDs(documentType, uids, params) {
        return await this.get(appendPredicates(params, [
          typePredicate(documentType),
          predicate.in(`my.${documentType}.uid`, uids)
        ]));
      }
      async getAllByUIDs(documentType, uids, params) {
        return await this.dangerouslyGetAll(appendPredicates(params, [
          typePredicate(documentType),
          predicate.in(`my.${documentType}.uid`, uids)
        ]));
      }
      async getSingle(documentType, params) {
        return await this.getFirst(appendPredicates(params, typePredicate(documentType)));
      }
      async getByType(documentType, params) {
        return await this.get(appendPredicates(params, typePredicate(documentType)));
      }
      async getAllByType(documentType, params) {
        return await this.dangerouslyGetAll(appendPredicates(params, typePredicate(documentType)));
      }
      async getByTag(tag, params) {
        return await this.get(appendPredicates(params, someTagsPredicate(tag)));
      }
      async getAllByTag(tag, params) {
        return await this.dangerouslyGetAll(appendPredicates(params, someTagsPredicate(tag)));
      }
      async getByEveryTag(tags, params) {
        return await this.get(appendPredicates(params, everyTagPredicate(tags)));
      }
      async getAllByEveryTag(tags, params) {
        return await this.dangerouslyGetAll(appendPredicates(params, everyTagPredicate(tags)));
      }
      async getBySomeTags(tags, params) {
        return await this.get(appendPredicates(params, someTagsPredicate(tags)));
      }
      async getAllBySomeTags(tags, params) {
        return await this.dangerouslyGetAll(appendPredicates(params, someTagsPredicate(tags)));
      }
      async getRepository(params) {
        const url = new URL(this.endpoint);
        if (this.accessToken) {
          url.searchParams.set("access_token", this.accessToken);
        }
        return await this.fetch(url.toString(), params);
      }
      async getRefs(params) {
        const repository = await this.getRepository(params);
        return repository.refs;
      }
      async getRefByID(id, params) {
        const refs = await this.getRefs(params);
        return findRefByID(refs, id);
      }
      async getRefByLabel(label, params) {
        const refs = await this.getRefs(params);
        return findRefByLabel(refs, label);
      }
      async getMasterRef(params) {
        const refs = await this.getRefs(params);
        return findMasterRef(refs);
      }
      async getReleases(params) {
        const refs = await this.getRefs(params);
        return refs.filter((ref) => !ref.isMasterRef);
      }
      async getReleaseByID(id, params) {
        const releases = await this.getReleases(params);
        return findRefByID(releases, id);
      }
      async getReleaseByLabel(label, params) {
        const releases = await this.getReleases(params);
        return findRefByLabel(releases, label);
      }
      async getTags(params) {
        try {
          const tagsForm = await this.getCachedRepositoryForm("tags", params);
          return await this.fetch(tagsForm.action);
        } catch (e) {
          const repository = await this.getRepository(params);
          return repository.tags;
        }
      }
      async buildQueryURL({
        signal,
        ...params
      } = {}) {
        const ref = params.ref || await this.getResolvedRefString();
        const integrationFieldsRef = params.integrationFieldsRef || (await this.getCachedRepository({ signal })).integrationFieldsRef || void 0;
        return buildQueryURL(this.endpoint, {
          ...this.defaultParams,
          ...params,
          ref,
          integrationFieldsRef,
          routes: params.routes || this.routes,
          accessToken: params.accessToken || this.accessToken
        });
      }
      async resolvePreviewURL(args) {
        var _a;
        let documentID = args.documentID;
        let previewToken = args.previewToken;
        if (typeof globalThis.location !== "undefined") {
          const searchParams = new URLSearchParams(globalThis.location.search);
          documentID = documentID || searchParams.get("documentId") || void 0;
          previewToken = previewToken || searchParams.get("token") || void 0;
        } else if ((_a = this.refState.httpRequest) == null ? void 0 : _a.query) {
          documentID = documentID || this.refState.httpRequest.query.documentId;
          previewToken = previewToken || this.refState.httpRequest.query.token;
        }
        if (documentID != null && previewToken != null) {
          const document = await this.getByID(documentID, {
            signal: args.signal,
            ref: previewToken,
            lang: "*"
          });
          const url = asLink(document, args.linkResolver);
          if (typeof url === "string") {
            return url;
          }
        }
        return args.defaultURL;
      }
      queryLatestContent() {
        this.refState.mode = "Master" /* Master */;
      }
      queryContentFromReleaseByID(releaseID) {
        this.refState = {
          ...this.refState,
          mode: "ReleaseID" /* ReleaseID */,
          releaseID
        };
      }
      queryContentFromReleaseByLabel(releaseLabel) {
        this.refState = {
          ...this.refState,
          mode: "ReleaseLabel" /* ReleaseLabel */,
          releaseLabel
        };
      }
      queryContentFromRef(ref) {
        this.refState = {
          ...this.refState,
          mode: "Manual" /* Manual */,
          ref
        };
      }
      async graphQLFetch(input, init) {
        const cachedRepository = await this.getCachedRepository();
        const ref = await this.getResolvedRefString();
        const unsanitizedHeaders = {
          "Prismic-ref": ref,
          "Prismic-integration-field-ref": cachedRepository.integrationFieldsRef || "",
          Authorization: this.accessToken ? `Token ${this.accessToken}` : "",
          ...init ? init.headers : {}
        };
        const headers = {};
        for (const key in unsanitizedHeaders) {
          if (unsanitizedHeaders[key]) {
            headers[key.toLowerCase()] = unsanitizedHeaders[key];
          }
        }
        const url = new URL(input);
        url.searchParams.set("ref", ref);
        const query = url.searchParams.get("query");
        if (query) {
          url.searchParams.set("query", minifyGraphQLQuery(query));
        }
        return await this.fetchFn(url.toString(), {
          ...init,
          headers
        });
      }
      async getCachedRepository(params) {
        if (!this.cachedRepository || Date.now() >= this.cachedRepositoryExpiration) {
          this.cachedRepositoryExpiration = Date.now() + REPOSITORY_CACHE_TTL;
          this.cachedRepository = await this.getRepository(params);
        }
        return this.cachedRepository;
      }
      async getCachedRepositoryForm(name, params) {
        const cachedRepository = await this.getCachedRepository(params);
        const form = cachedRepository.forms[name];
        if (!form) {
          throw new PrismicError(`Form with name "${name}" could not be found`, void 0, void 0);
        }
        return form;
      }
      async getResolvedRefString(params) {
        var _a, _b, _c;
        if (this.refState.autoPreviewsEnabled) {
          let previewRef = void 0;
          if ((_a = globalThis.document) == null ? void 0 : _a.cookie) {
            previewRef = getCookie(preview, globalThis.document.cookie);
          } else if ((_c = (_b = this.refState.httpRequest) == null ? void 0 : _b.headers) == null ? void 0 : _c.cookie) {
            previewRef = getCookie(preview, this.refState.httpRequest.headers.cookie);
          }
          if (previewRef) {
            return previewRef;
          }
        }
        const cachedRepository = await this.getCachedRepository(params);
        const refModeType = this.refState.mode;
        if (refModeType === "ReleaseID" /* ReleaseID */) {
          return findRefByID(cachedRepository.refs, this.refState.releaseID).ref;
        } else if (refModeType === "ReleaseLabel" /* ReleaseLabel */) {
          return findRefByLabel(cachedRepository.refs, this.refState.releaseLabel).ref;
        } else if (refModeType === "Manual" /* Manual */) {
          const res = await castThunk(this.refState.ref)();
          if (typeof res === "string") {
            return res;
          }
        }
        return findMasterRef(cachedRepository.refs).ref;
      }
      async fetch(url, params = {}) {
        const res = await this.fetchFn(url, {
          signal: params.signal
        });
        let json;
        try {
          json = await res.json();
        } catch (e) {
          if (res.status === 404) {
            throw new NotFoundError(`Prismic repository not found. Check that "${this.endpoint}" is pointing to the correct repository.`, url, void 0);
          } else {
            throw new PrismicError(void 0, url, void 0);
          }
        }
        switch (res.status) {
          case 200: {
            return json;
          }
          case 400: {
            throw new ParsingError(json.message, url, json);
          }
          case 401:
          case 403: {
            throw new ForbiddenError("error" in json ? json.error : json.message, url, json);
          }
        }
        throw new PrismicError(void 0, url, json);
      }
    }

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
        const client = createClient$1(repoName, clientOptions);
        return client;
    };

    /* src/components/Loader.svelte generated by Svelte v3.48.0 */

    const file$4 = "src/components/Loader.svelte";

    function create_fragment$4(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text("Loading...");
    			this.h();
    		},
    		l: function claim(nodes) {
    			p = claim_element(nodes, "P", {});
    			var p_nodes = children(p);
    			t = claim_text(p_nodes, "Loading...");
    			p_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(p, file$4, 0, 0, 0);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, p, anchor);
    			append_hydration_dev(p, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Loader', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Loader> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Loader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loader",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const asscroll$1 = writable();

    /* src/components/ProjectItem.svelte generated by Svelte v3.48.0 */
    const file$3 = "src/components/ProjectItem.svelte";

    function get_then_context$1(ctx) {
    	const constants_0 = /*project*/ ctx[4].data.direct_link.url;
    	ctx[5] = constants_0;
    }

    // (17:0) {#if item.project.slug}
    function create_if_block$1(ctx) {
    	let await_block_anchor;
    	let promise;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block$2,
    		then: create_then_block$2,
    		catch: create_catch_block$2,
    		value: 4,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*loadProject*/ ctx[1](/*item*/ ctx[0].project.slug), info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		l: function claim(nodes) {
    			await_block_anchor = empty();
    			info.block.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*item*/ 1 && promise !== (promise = /*loadProject*/ ctx[1](/*item*/ ctx[0].project.slug)) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(17:0) {#if item.project.slug}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>     import * as prismicH from "@prismicio/helpers";     import { link }
    function create_catch_block$2(ctx) {
    	const block = {
    		c: noop,
    		l: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$2.name,
    		type: "catch",
    		source: "(1:0) <script>     import * as prismicH from \\\"@prismicio/helpers\\\";     import { link }",
    		ctx
    	});

    	return block;
    }

    // (20:4) {:then project}
    function create_then_block$2(ctx) {
    	get_then_context$1(ctx);
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let a;
    	let span;
    	let t1;
    	let a_href_value;
    	let a_class_value;
    	let t2;
    	let mounted;
    	let dispose;
    	let if_block = /*directLink*/ ctx[5] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			a = element("a");
    			span = element("span");
    			t1 = text("en savoir plus");
    			t2 = space();
    			if (if_block) if_block.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			img = claim_element(div_nodes, "IMG", { src: true, alt: true, class: true });
    			t0 = claim_space(div_nodes);
    			a = claim_element(div_nodes, "A", { href: true, class: true });
    			var a_nodes = children(a);
    			span = claim_element(a_nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t1 = claim_text(span_nodes, "en savoir plus");
    			span_nodes.forEach(detach_dev);
    			a_nodes.forEach(detach_dev);
    			t2 = claim_space(div_nodes);
    			if (if_block) if_block.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			if (!src_url_equal(img.src, img_src_value = /*project*/ ctx[4].data.image.url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*project*/ ctx[4].data.image.alt);
    			attr_dev(img, "class", "image svelte-1bb200z");
    			add_location(img, file$3, 22, 12, 619);
    			attr_dev(span, "class", "link-text link-text--internal svelte-1bb200z");
    			add_location(span, file$3, 33, 16, 942);
    			attr_dev(a, "href", a_href_value = /*project*/ ctx[4].url);
    			attr_dev(a, "class", a_class_value = "link link--internal " + (/*directLink*/ ctx[5] ? '' : 'link--only') + " svelte-1bb200z");
    			add_location(a, file$3, 28, 12, 772);
    			attr_dev(div, "class", "container svelte-1bb200z");
    			add_location(div, file$3, 21, 8, 583);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, img);
    			append_hydration_dev(div, t0);
    			append_hydration_dev(div, a);
    			append_hydration_dev(a, span);
    			append_hydration_dev(span, t1);
    			append_hydration_dev(div, t2);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = action_destroyer(link$1.call(null, a));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			get_then_context$1(ctx);

    			if (dirty & /*item*/ 1 && !src_url_equal(img.src, img_src_value = /*project*/ ctx[4].data.image.url)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*item*/ 1 && img_alt_value !== (img_alt_value = /*project*/ ctx[4].data.image.alt)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*item*/ 1 && a_href_value !== (a_href_value = /*project*/ ctx[4].url)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*item*/ 1 && a_class_value !== (a_class_value = "link link--internal " + (/*directLink*/ ctx[5] ? '' : 'link--only') + " svelte-1bb200z")) {
    				attr_dev(a, "class", a_class_value);
    			}

    			if (/*directLink*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$2.name,
    		type: "then",
    		source: "(20:4) {:then project}",
    		ctx
    	});

    	return block;
    }

    // (39:12) {#if directLink}
    function create_if_block_1$1(ctx) {
    	let a;
    	let span;
    	let t;
    	let a_href_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			span = element("span");
    			t = text("accéder au site");
    			this.h();
    		},
    		l: function claim(nodes) {
    			a = claim_element(nodes, "A", { href: true, class: true, target: true });
    			var a_nodes = children(a);
    			span = claim_element(a_nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "accéder au site");
    			span_nodes.forEach(detach_dev);
    			a_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "link-text link-text--external svelte-1bb200z");
    			add_location(span, file$3, 45, 20, 1301);
    			attr_dev(a, "href", a_href_value = /*directLink*/ ctx[5]);
    			attr_dev(a, "class", "link link--external svelte-1bb200z");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$3, 39, 16, 1109);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, a, anchor);
    			append_hydration_dev(a, span);
    			append_hydration_dev(span, t);

    			if (!mounted) {
    				dispose = action_destroyer(link$1.call(null, a));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 1 && a_href_value !== (a_href_value = /*directLink*/ ctx[5])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(39:12) {#if directLink}",
    		ctx
    	});

    	return block;
    }

    // (18:43)          <Loader />     {:then project}
    function create_pending_block$2(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(loader.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$2.name,
    		type: "pending",
    		source: "(18:43)          <Loader />     {:then project}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*item*/ ctx[0].project.slug && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_hydration_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*item*/ ctx[0].project.slug) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $asscroll;
    	validate_store(asscroll$1, 'asscroll');
    	component_subscribe($$self, asscroll$1, $$value => $$invalidate(3, $asscroll = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProjectItem', slots, []);
    	let { item } = $$props;
    	let { client } = $$props;

    	async function loadProject(slug) {
    		const response = await client.getByUID("projects", slug);
    		$asscroll.resize();
    		return response;
    	}

    	const writable_props = ['item', 'client'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProjectItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('client' in $$props) $$invalidate(2, client = $$props.client);
    	};

    	$$self.$capture_state = () => ({
    		prismicH,
    		link: link$1,
    		Loader,
    		asscroll: asscroll$1,
    		item,
    		client,
    		loadProject,
    		$asscroll
    	});

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('client' in $$props) $$invalidate(2, client = $$props.client);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [item, loadProject, client];
    }

    class ProjectItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { item: 0, client: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProjectItem",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*item*/ ctx[0] === undefined && !('item' in props)) {
    			console.warn("<ProjectItem> was created without expected prop 'item'");
    		}

    		if (/*client*/ ctx[2] === undefined && !('client' in props)) {
    			console.warn("<ProjectItem> was created without expected prop 'client'");
    		}
    	}

    	get item() {
    		throw new Error("<ProjectItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<ProjectItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get client() {
    		throw new Error("<ProjectItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set client(value) {
    		throw new Error("<ProjectItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Home.svelte generated by Svelte v3.48.0 */
    const file$2 = "src/pages/Home.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (65:4) {:catch error}
    function create_catch_block$1(ctx) {
    	let pre;
    	let t_value = /*error*/ ctx[11].message + "";
    	let t;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			t = text(t_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			pre = claim_element(nodes, "PRE", {});
    			var pre_nodes = children(pre);
    			t = claim_text(pre_nodes, t_value);
    			pre_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(pre, file$2, 65, 8, 1956);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, pre, anchor);
    			append_hydration_dev(pre, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$1.name,
    		type: "catch",
    		source: "(65:4) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (35:4) {:then home}
    function create_then_block$1(ctx) {
    	let header;
    	let h1;
    	let span0;
    	let t0_value = asText(/*home*/ ctx[4].data.title) + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = asText(/*home*/ ctx[4].data.titlebis) + "";
    	let t2;
    	let t3;
    	let h2;
    	let t4_value = asText(/*home*/ ctx[4].data.subtitle) + "";
    	let t4;
    	let t5;
    	let main;
    	let current;
    	let each_value = /*home*/ ctx[4].data.body;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			h2 = element("h2");
    			t4 = text(t4_value);
    			t5 = space();
    			main = element("main");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			header = claim_element(nodes, "HEADER", { class: true });
    			var header_nodes = children(header);
    			h1 = claim_element(header_nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			span0 = claim_element(h1_nodes, "SPAN", { class: true });
    			var span0_nodes = children(span0);
    			t0 = claim_text(span0_nodes, t0_value);
    			span0_nodes.forEach(detach_dev);
    			t1 = claim_space(h1_nodes);
    			span1 = claim_element(h1_nodes, "SPAN", { class: true });
    			var span1_nodes = children(span1);
    			t2 = claim_text(span1_nodes, t2_value);
    			span1_nodes.forEach(detach_dev);
    			h1_nodes.forEach(detach_dev);
    			t3 = claim_space(header_nodes);
    			h2 = claim_element(header_nodes, "H2", { class: true });
    			var h2_nodes = children(h2);
    			t4 = claim_text(h2_nodes, t4_value);
    			h2_nodes.forEach(detach_dev);
    			header_nodes.forEach(detach_dev);
    			t5 = claim_space(nodes);
    			main = claim_element(nodes, "MAIN", { class: true });
    			var main_nodes = children(main);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(main_nodes);
    			}

    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span0, "class", "title svelte-wfqd6a");
    			add_location(span0, file$2, 37, 16, 981);
    			attr_dev(span1, "class", "title-bis svelte-wfqd6a");
    			add_location(span1, file$2, 38, 16, 1059);
    			attr_dev(h1, "class", "svelte-wfqd6a");
    			add_location(h1, file$2, 36, 12, 960);
    			attr_dev(h2, "class", "svelte-wfqd6a");
    			add_location(h2, file$2, 43, 12, 1197);
    			attr_dev(header, "class", "svelte-wfqd6a");
    			add_location(header, file$2, 35, 8, 939);
    			attr_dev(main, "class", "svelte-wfqd6a");
    			add_location(main, file$2, 46, 8, 1271);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, header, anchor);
    			append_hydration_dev(header, h1);
    			append_hydration_dev(h1, span0);
    			append_hydration_dev(span0, t0);
    			append_hydration_dev(h1, t1);
    			append_hydration_dev(h1, span1);
    			append_hydration_dev(span1, t2);
    			append_hydration_dev(header, t3);
    			append_hydration_dev(header, h2);
    			append_hydration_dev(h2, t4);
    			insert_hydration_dev(target, t5, anchor);
    			insert_hydration_dev(target, main, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prismicQuery, client, prismicH*/ 6) {
    				each_value = /*home*/ ctx[4].data.body;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(main, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$1.name,
    		type: "then",
    		source: "(35:4) {:then home}",
    		ctx
    	});

    	return block;
    }

    // (58:24) {#each timelinePiece.items as item}
    function create_each_block_1$1(ctx) {
    	let projectitem;
    	let current;

    	projectitem = new ProjectItem({
    			props: {
    				item: /*item*/ ctx[8],
    				client: /*client*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(projectitem.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(projectitem.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(projectitem, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(projectitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(projectitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(projectitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(58:24) {#each timelinePiece.items as item}",
    		ctx
    	});

    	return block;
    }

    // (48:12) {#each home.data.body as timelinePiece}
    function create_each_block$1(ctx) {
    	let div2;
    	let p;
    	let t0_value = asText(/*timelinePiece*/ ctx[5].primary.year) + "";
    	let t0;
    	let t1;
    	let div0;
    	let raw_value = asHTML(/*timelinePiece*/ ctx[5].primary.title) + "";
    	let t2;
    	let div1;
    	let t3;
    	let current;
    	let each_value_1 = /*timelinePiece*/ ctx[5].items;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div2 = claim_element(nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			p = claim_element(div2_nodes, "P", { class: true });
    			var p_nodes = children(p);
    			t0 = claim_text(p_nodes, t0_value);
    			p_nodes.forEach(detach_dev);
    			t1 = claim_space(div2_nodes);
    			div0 = claim_element(div2_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			div0_nodes.forEach(detach_dev);
    			t2 = claim_space(div2_nodes);
    			div1 = claim_element(div2_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div1_nodes);
    			}

    			div1_nodes.forEach(detach_dev);
    			t3 = claim_space(div2_nodes);
    			div2_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(p, "class", "year svelte-wfqd6a");
    			add_location(p, file$2, 49, 20, 1385);
    			attr_dev(div0, "class", "description svelte-wfqd6a");
    			add_location(div0, file$2, 52, 20, 1517);
    			attr_dev(div1, "class", "projects svelte-wfqd6a");
    			add_location(div1, file$2, 56, 20, 1668);
    			attr_dev(div2, "class", "step");
    			add_location(div2, file$2, 48, 16, 1346);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div2, anchor);
    			append_hydration_dev(div2, p);
    			append_hydration_dev(p, t0);
    			append_hydration_dev(div2, t1);
    			append_hydration_dev(div2, div0);
    			div0.innerHTML = raw_value;
    			append_hydration_dev(div2, t2);
    			append_hydration_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_hydration_dev(div2, t3);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prismicQuery, client*/ 6) {
    				each_value_1 = /*timelinePiece*/ ctx[5].items;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(48:12) {#each home.data.body as timelinePiece}",
    		ctx
    	});

    	return block;
    }

    // (33:25)          <Loader />     {:then home}
    function create_pending_block$1(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(loader.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$1.name,
    		type: "pending",
    		source: "(33:25)          <Loader />     {:then home}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$1,
    		then: create_then_block$1,
    		catch: create_catch_block$1,
    		value: 4,
    		error: 11,
    		blocks: [,,,]
    	};

    	handle_promise(/*prismicQuery*/ ctx[2], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			info.block.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true, style: true });
    			var div_nodes = children(div);
    			info.block.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "scroll-ctn svelte-wfqd6a");
    			attr_dev(div, "style", /*cssVar*/ ctx[0]);
    			add_location(div, file$2, 31, 0, 829);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);

    			if (!current || dirty & /*cssVar*/ 1) {
    				attr_dev(div, "style", /*cssVar*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $asscroll;
    	validate_store(asscroll$1, 'asscroll');
    	component_subscribe($$self, asscroll$1, $$value => $$invalidate(3, $asscroll = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	const client = createClient();
    	const prismicQuery = client.getSingle("home");
    	let cssVar;

    	onMount(() => {
    		$asscroll.enable({
    			newScrollElements: document.querySelector(".scroll-ctn"),
    			horizontalScroll: true,
    			reset: true
    		});

    		$asscroll.on("scroll", scrollPos => {
    			$$invalidate(0, cssVar = `--scroll-pos:${scrollPos}px`);
    		});

    		return () => {
    			$asscroll.disable();
    		};
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createClient,
    		prismicH,
    		Loader,
    		onMount,
    		asscroll: asscroll$1,
    		ProjectItem,
    		client,
    		prismicQuery,
    		cssVar,
    		$asscroll
    	});

    	$$self.$inject_state = $$props => {
    		if ('cssVar' in $$props) $$invalidate(0, cssVar = $$props.cssVar);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [cssVar, client, prismicQuery];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/pages/Project.svelte generated by Svelte v3.48.0 */
    const file$1 = "src/pages/Project.svelte";

    function get_then_context(ctx) {
    	const constants_0 = /*project*/ ctx[3].data.direct_link.url;
    	ctx[4] = constants_0;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (53:0) {:catch error}
    function create_catch_block(ctx) {
    	let pre;
    	let t_value = /*error*/ ctx[11].message + "";
    	let t;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			t = text(t_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			pre = claim_element(nodes, "PRE", {});
    			var pre_nodes = children(pre);
    			t = claim_text(pre_nodes, t_value);
    			pre_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(pre, file$1, 53, 4, 1539);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, pre, anchor);
    			append_hydration_dev(pre, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(53:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (15:0) {:then project}
    function create_then_block(ctx) {
    	get_then_context(ctx);
    	let article;
    	let link_1;
    	let t0;
    	let div0;
    	let h1;
    	let t1_value = asText(/*project*/ ctx[3].data.title) + "";
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let html_tag;
    	let raw_value = asHTML(/*project*/ ctx[3].data.description) + "";
    	let t5;
    	let div1;
    	let current;

    	link_1 = new Link({
    			props: {
    				to: "/",
    				class: "close",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block0 = /*directLink*/ ctx[4] && create_if_block_2(ctx);
    	let if_block1 = /*project*/ ctx[3].tags && create_if_block_1(ctx);
    	let if_block2 = /*project*/ ctx[3].data.slider && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			article = element("article");
    			create_component(link_1.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			html_tag = new HtmlTagHydration(false);
    			t5 = space();
    			div1 = element("div");
    			if (if_block2) if_block2.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			article = claim_element(nodes, "ARTICLE", { class: true });
    			var article_nodes = children(article);
    			claim_component(link_1.$$.fragment, article_nodes);
    			t0 = claim_space(article_nodes);
    			div0 = claim_element(article_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			h1 = claim_element(div0_nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			t1 = claim_text(h1_nodes, t1_value);
    			t2 = claim_space(h1_nodes);
    			if (if_block0) if_block0.l(h1_nodes);
    			h1_nodes.forEach(detach_dev);
    			t3 = claim_space(div0_nodes);
    			if (if_block1) if_block1.l(div0_nodes);
    			t4 = claim_space(div0_nodes);
    			html_tag = claim_html_tag(div0_nodes, false);
    			div0_nodes.forEach(detach_dev);
    			t5 = claim_space(article_nodes);
    			div1 = claim_element(article_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			if (if_block2) if_block2.l(div1_nodes);
    			div1_nodes.forEach(detach_dev);
    			article_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(h1, "class", "svelte-ktho7");
    			add_location(h1, file$1, 23, 12, 636);
    			html_tag.a = null;
    			attr_dev(div0, "class", "description svelte-ktho7");
    			add_location(div0, file$1, 22, 8, 598);
    			attr_dev(div1, "class", "slider svelte-ktho7");
    			add_location(div1, file$1, 44, 8, 1264);
    			attr_dev(article, "class", "ctn svelte-ktho7");
    			add_location(article, file$1, 17, 4, 459);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, article, anchor);
    			mount_component(link_1, article, null);
    			append_hydration_dev(article, t0);
    			append_hydration_dev(article, div0);
    			append_hydration_dev(div0, h1);
    			append_hydration_dev(h1, t1);
    			append_hydration_dev(h1, t2);
    			if (if_block0) if_block0.m(h1, null);
    			append_hydration_dev(div0, t3);
    			if (if_block1) if_block1.m(div0, null);
    			append_hydration_dev(div0, t4);
    			html_tag.m(raw_value, div0);
    			append_hydration_dev(article, t5);
    			append_hydration_dev(article, div1);
    			if (if_block2) if_block2.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			get_then_context(ctx);
    			const link_1_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				link_1_changes.$$scope = { dirty, ctx };
    			}

    			link_1.$set(link_1_changes);
    			if (/*directLink*/ ctx[4]) if_block0.p(ctx, dirty);
    			if (/*project*/ ctx[3].tags) if_block1.p(ctx, dirty);
    			if (/*project*/ ctx[3].data.slider) if_block2.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    			destroy_component(link_1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(15:0) {:then project}",
    		ctx
    	});

    	return block;
    }

    // (19:8) <Link to="/" class="close">
    function create_default_slot$1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			this.h();
    		},
    		l: function claim(nodes) {
    			img = claim_element(nodes, "IMG", { src: true, alt: true });
    			this.h();
    		},
    		h: function hydrate() {
    			if (!src_url_equal(img.src, img_src_value = "/images/cross.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Croix");
    			add_location(img, file$1, 19, 12, 529);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, img, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(19:8) <Link to=\\\"/\\\" class=\\\"close\\\">",
    		ctx
    	});

    	return block;
    }

    // (27:16) {#if directLink}
    function create_if_block_2(ctx) {
    	let a;
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			img = element("img");
    			this.h();
    		},
    		l: function claim(nodes) {
    			a = claim_element(nodes, "A", { href: true, class: true, target: true });
    			var a_nodes = children(a);
    			img = claim_element(a_nodes, "IMG", { src: true, alt: true, class: true });
    			a_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			if (!src_url_equal(img.src, img_src_value = "/images/purple-arrow.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-ktho7");
    			add_location(img, file$1, 28, 24, 833);
    			attr_dev(a, "href", /*directLink*/ ctx[4]);
    			attr_dev(a, "class", "link svelte-ktho7");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$1, 27, 20, 749);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, a, anchor);
    			append_hydration_dev(a, img);

    			if (!mounted) {
    				dispose = action_destroyer(link$1.call(null, a));
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(27:16) {#if directLink}",
    		ctx
    	});

    	return block;
    }

    // (34:12) {#if project.tags}
    function create_if_block_1(ctx) {
    	let ul;
    	let each_value_1 = /*project*/ ctx[3].tags;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			ul = claim_element(nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(ul, "class", "tags svelte-ktho7");
    			add_location(ul, file$1, 34, 16, 992);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prismicQuery*/ 1) {
    				each_value_1 = /*project*/ ctx[3].tags;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(34:12) {#if project.tags}",
    		ctx
    	});

    	return block;
    }

    // (36:20) {#each project.tags as tag}
    function create_each_block_1(ctx) {
    	let li;
    	let t_value = /*tag*/ ctx[8] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			li = claim_element(nodes, "LI", { class: true });
    			var li_nodes = children(li);
    			t = claim_text(li_nodes, t_value);
    			li_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(li, "class", "tag svelte-ktho7");
    			add_location(li, file$1, 36, 24, 1082);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, li, anchor);
    			append_hydration_dev(li, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(36:20) {#each project.tags as tag}",
    		ctx
    	});

    	return block;
    }

    // (46:12) {#if project.data.slider}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*project*/ ctx[3].data.slider;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(nodes);
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_hydration_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prismicQuery*/ 1) {
    				each_value = /*project*/ ctx[3].data.slider;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(46:12) {#if project.data.slider}",
    		ctx
    	});

    	return block;
    }

    // (47:16) {#each project.data.slider as slide}
    function create_each_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			this.h();
    		},
    		l: function claim(nodes) {
    			img = claim_element(nodes, "IMG", { src: true, alt: true, class: true });
    			this.h();
    		},
    		h: function hydrate() {
    			if (!src_url_equal(img.src, img_src_value = /*slide*/ ctx[5].image.url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*slide*/ ctx[5].image.alt);
    			attr_dev(img, "class", "svelte-ktho7");
    			add_location(img, file$1, 47, 20, 1396);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, img, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(47:16) {#each project.data.slider as slide}",
    		ctx
    	});

    	return block;
    }

    // (13:21)      <Loader /> {:then project}
    function create_pending_block(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(loader.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(13:21)      <Loader /> {:then project}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let await_block_anchor;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 3,
    		error: 11,
    		blocks: [,,,]
    	};

    	handle_promise(/*prismicQuery*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		l: function claim(nodes) {
    			await_block_anchor = empty();
    			info.block.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Project', slots, []);
    	let { slug } = $$props;
    	const client = createClient();
    	const prismicQuery = client.getByUID("projects", slug);
    	const writable_props = ['slug'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Project> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('slug' in $$props) $$invalidate(1, slug = $$props.slug);
    	};

    	$$self.$capture_state = () => ({
    		createClient,
    		prismicH,
    		Loader,
    		Link,
    		link: link$1,
    		slug,
    		client,
    		prismicQuery
    	});

    	$$self.$inject_state = $$props => {
    		if ('slug' in $$props) $$invalidate(1, slug = $$props.slug);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [prismicQuery, slug];
    }

    class Project extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { slug: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Project",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*slug*/ ctx[1] === undefined && !('slug' in props)) {
    			console.warn("<Project> was created without expected prop 'slug'");
    		}
    	}

    	get slug() {
    		throw new Error("<Project>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set slug(value) {
    		throw new Error("<Project>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var asscroll = createCommonjsModule(function (module, exports) {
    (function webpackUniversalModuleDefinition(root, factory) {
    	module.exports = factory();
    })(self, function() {
    return /******/ (function() { // webpackBootstrap
    /******/ 	var __webpack_modules__ = ({

    /***/ 672:
    /***/ (function(module) {

    const store = {
      html: document.documentElement,
      body: document.body,
      window: {
        w: window.innerWidth,
        h: window.innerHeight
      }
    };
    module.exports = store;

    /***/ }),

    /***/ 336:
    /***/ (function(module) {

    module.exports = function debounce(fn, delay) {
      let timeoutID = null;
      return function () {
        clearTimeout(timeoutID);
        const args = arguments;
        const that = this;
        timeoutID = setTimeout(function () {
          fn.apply(that, args);
        }, delay);
      };
    };

    /***/ })

    /******/ 	});
    /************************************************************************/
    /******/ 	// The module cache
    /******/ 	var __webpack_module_cache__ = {};
    /******/ 	
    /******/ 	// The require function
    /******/ 	function __webpack_require__(moduleId) {
    /******/ 		// Check if module is in cache
    /******/ 		var cachedModule = __webpack_module_cache__[moduleId];
    /******/ 		if (cachedModule !== undefined) {
    /******/ 			return cachedModule.exports;
    /******/ 		}
    /******/ 		// Create a new module (and put it into the cache)
    /******/ 		var module = __webpack_module_cache__[moduleId] = {
    /******/ 			// no module.id needed
    /******/ 			// no module.loaded needed
    /******/ 			exports: {}
    /******/ 		};
    /******/ 	
    /******/ 		// Execute the module function
    /******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    /******/ 	
    /******/ 		// Return the exports of the module
    /******/ 		return module.exports;
    /******/ 	}
    /******/ 	
    /************************************************************************/
    /******/ 	/* webpack/runtime/compat get default export */
    /******/ 	!function() {
    /******/ 		// getDefaultExport function for compatibility with non-harmony modules
    /******/ 		__webpack_require__.n = function(module) {
    /******/ 			var getter = module && module.__esModule ?
    /******/ 				function() { return module['default']; } :
    /******/ 				function() { return module; };
    /******/ 			__webpack_require__.d(getter, { a: getter });
    /******/ 			return getter;
    /******/ 		};
    /******/ 	}();
    /******/ 	
    /******/ 	/* webpack/runtime/define property getters */
    /******/ 	!function() {
    /******/ 		// define getter functions for harmony exports
    /******/ 		__webpack_require__.d = function(exports, definition) {
    /******/ 			for(var key in definition) {
    /******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
    /******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
    /******/ 				}
    /******/ 			}
    /******/ 		};
    /******/ 	}();
    /******/ 	
    /******/ 	/* webpack/runtime/hasOwnProperty shorthand */
    /******/ 	!function() {
    /******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); };
    /******/ 	}();
    /******/ 	
    /************************************************************************/
    var __webpack_exports__ = {};
    // This entry need to be wrapped in an IIFE because it need to be in strict mode.
    !function() {

    // EXPORTS
    __webpack_require__.d(__webpack_exports__, {
      "default": function() { return /* binding */ src; }
    });

    // EXTERNAL MODULE: ./src/utils/debounce.js
    var debounce = __webpack_require__(336);
    var debounce_default = /*#__PURE__*/__webpack_require__.n(debounce);
    // EXTERNAL MODULE: ./src/store.js
    var store = __webpack_require__(672);
    var store_default = /*#__PURE__*/__webpack_require__.n(store);
    // Public: Create a new SelectorSet.
    function SelectorSet() {
      // Construct new SelectorSet if called as a function.
      if (!(this instanceof SelectorSet)) {
        return new SelectorSet();
      }

      // Public: Number of selectors added to the set
      this.size = 0;

      // Internal: Incrementing ID counter
      this.uid = 0;

      // Internal: Array of String selectors in the set
      this.selectors = [];

      // Internal: Map of selector ids to objects
      this.selectorObjects = {};

      // Internal: All Object index String names mapping to Index objects.
      this.indexes = Object.create(this.indexes);

      // Internal: Used Object index String names mapping to Index objects.
      this.activeIndexes = [];
    }

    // Detect prefixed Element#matches function.
    var docElem = window.document.documentElement;
    var matches =
      docElem.matches ||
      docElem.webkitMatchesSelector ||
      docElem.mozMatchesSelector ||
      docElem.oMatchesSelector ||
      docElem.msMatchesSelector;

    // Public: Check if element matches selector.
    //
    // Maybe overridden with custom Element.matches function.
    //
    // el       - An Element
    // selector - String CSS selector
    //
    // Returns true or false.
    SelectorSet.prototype.matchesSelector = function(el, selector) {
      return matches.call(el, selector);
    };

    // Public: Find all elements in the context that match the selector.
    //
    // Maybe overridden with custom querySelectorAll function.
    //
    // selectors - String CSS selectors.
    // context   - Element context
    //
    // Returns non-live list of Elements.
    SelectorSet.prototype.querySelectorAll = function(selectors, context) {
      return context.querySelectorAll(selectors);
    };

    // Public: Array of indexes.
    //
    // name     - Unique String name
    // selector - Function that takes a String selector and returns a String key
    //            or undefined if it can't be used by the index.
    // element  - Function that takes an Element and returns an Array of String
    //            keys that point to indexed values.
    //
    SelectorSet.prototype.indexes = [];

    // Index by element id
    var idRe = /^#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/g;
    SelectorSet.prototype.indexes.push({
      name: 'ID',
      selector: function matchIdSelector(sel) {
        var m;
        if ((m = sel.match(idRe))) {
          return m[0].slice(1);
        }
      },
      element: function getElementId(el) {
        if (el.id) {
          return [el.id];
        }
      }
    });

    // Index by all of its class names
    var classRe = /^\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/g;
    SelectorSet.prototype.indexes.push({
      name: 'CLASS',
      selector: function matchClassSelector(sel) {
        var m;
        if ((m = sel.match(classRe))) {
          return m[0].slice(1);
        }
      },
      element: function getElementClassNames(el) {
        var className = el.className;
        if (className) {
          if (typeof className === 'string') {
            return className.split(/\s/);
          } else if (typeof className === 'object' && 'baseVal' in className) {
            // className is a SVGAnimatedString
            // global SVGAnimatedString is not an exposed global in Opera 12
            return className.baseVal.split(/\s/);
          }
        }
      }
    });

    // Index by tag/node name: `DIV`, `FORM`, `A`
    var tagRe = /^((?:[\w\u00c0-\uFFFF\-]|\\.)+)/g;
    SelectorSet.prototype.indexes.push({
      name: 'TAG',
      selector: function matchTagSelector(sel) {
        var m;
        if ((m = sel.match(tagRe))) {
          return m[0].toUpperCase();
        }
      },
      element: function getElementTagName(el) {
        return [el.nodeName.toUpperCase()];
      }
    });

    // Default index just contains a single array of elements.
    SelectorSet.prototype.indexes['default'] = {
      name: 'UNIVERSAL',
      selector: function() {
        return true;
      },
      element: function() {
        return [true];
      }
    };

    // Use ES Maps when supported
    var Map;
    if (typeof window.Map === 'function') {
      Map = window.Map;
    } else {
      Map = (function() {
        function Map() {
          this.map = {};
        }
        Map.prototype.get = function(key) {
          return this.map[key + ' '];
        };
        Map.prototype.set = function(key, value) {
          this.map[key + ' '] = value;
        };
        return Map;
      })();
    }

    // Regexps adopted from Sizzle
    //   https://github.com/jquery/sizzle/blob/1.7/sizzle.js
    //
    var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g;

    // Internal: Get indexes for selector.
    //
    // selector - String CSS selector
    //
    // Returns Array of {index, key}.
    function parseSelectorIndexes(allIndexes, selector) {
      allIndexes = allIndexes.slice(0).concat(allIndexes['default']);

      var allIndexesLen = allIndexes.length,
        i,
        j,
        m,
        dup,
        rest = selector,
        key,
        index,
        indexes = [];

      do {
        chunker.exec('');
        if ((m = chunker.exec(rest))) {
          rest = m[3];
          if (m[2] || !rest) {
            for (i = 0; i < allIndexesLen; i++) {
              index = allIndexes[i];
              if ((key = index.selector(m[1]))) {
                j = indexes.length;
                dup = false;
                while (j--) {
                  if (indexes[j].index === index && indexes[j].key === key) {
                    dup = true;
                    break;
                  }
                }
                if (!dup) {
                  indexes.push({ index: index, key: key });
                }
                break;
              }
            }
          }
        }
      } while (m);

      return indexes;
    }

    // Internal: Find first item in Array that is a prototype of `proto`.
    //
    // ary   - Array of objects
    // proto - Prototype of expected item in `ary`
    //
    // Returns object from `ary` if found. Otherwise returns undefined.
    function findByPrototype(ary, proto) {
      var i, len, item;
      for (i = 0, len = ary.length; i < len; i++) {
        item = ary[i];
        if (proto.isPrototypeOf(item)) {
          return item;
        }
      }
    }

    // Public: Log when added selector falls under the default index.
    //
    // This API should not be considered stable. May change between
    // minor versions.
    //
    // obj - {selector, data} Object
    //
    //   SelectorSet.prototype.logDefaultIndexUsed = function(obj) {
    //     console.warn(obj.selector, "could not be indexed");
    //   };
    //
    // Returns nothing.
    SelectorSet.prototype.logDefaultIndexUsed = function() {};

    // Public: Add selector to set.
    //
    // selector - String CSS selector
    // data     - Optional data Object (default: undefined)
    //
    // Returns nothing.
    SelectorSet.prototype.add = function(selector, data) {
      var obj,
        i,
        indexProto,
        key,
        index,
        objs,
        selectorIndexes,
        selectorIndex,
        indexes = this.activeIndexes,
        selectors = this.selectors,
        selectorObjects = this.selectorObjects;

      if (typeof selector !== 'string') {
        return;
      }

      obj = {
        id: this.uid++,
        selector: selector,
        data: data
      };
      selectorObjects[obj.id] = obj;

      selectorIndexes = parseSelectorIndexes(this.indexes, selector);
      for (i = 0; i < selectorIndexes.length; i++) {
        selectorIndex = selectorIndexes[i];
        key = selectorIndex.key;
        indexProto = selectorIndex.index;

        index = findByPrototype(indexes, indexProto);
        if (!index) {
          index = Object.create(indexProto);
          index.map = new Map();
          indexes.push(index);
        }

        if (indexProto === this.indexes['default']) {
          this.logDefaultIndexUsed(obj);
        }
        objs = index.map.get(key);
        if (!objs) {
          objs = [];
          index.map.set(key, objs);
        }
        objs.push(obj);
      }

      this.size++;
      selectors.push(selector);
    };

    // Public: Remove selector from set.
    //
    // selector - String CSS selector
    // data     - Optional data Object (default: undefined)
    //
    // Returns nothing.
    SelectorSet.prototype.remove = function(selector, data) {
      if (typeof selector !== 'string') {
        return;
      }

      var selectorIndexes,
        selectorIndex,
        i,
        j,
        k,
        selIndex,
        objs,
        obj,
        indexes = this.activeIndexes,
        selectors = (this.selectors = []),
        selectorObjects = this.selectorObjects,
        removedIds = {},
        removeAll = arguments.length === 1;

      selectorIndexes = parseSelectorIndexes(this.indexes, selector);
      for (i = 0; i < selectorIndexes.length; i++) {
        selectorIndex = selectorIndexes[i];

        j = indexes.length;
        while (j--) {
          selIndex = indexes[j];
          if (selectorIndex.index.isPrototypeOf(selIndex)) {
            objs = selIndex.map.get(selectorIndex.key);
            if (objs) {
              k = objs.length;
              while (k--) {
                obj = objs[k];
                if (obj.selector === selector && (removeAll || obj.data === data)) {
                  objs.splice(k, 1);
                  removedIds[obj.id] = true;
                }
              }
            }
            break;
          }
        }
      }

      for (i in removedIds) {
        delete selectorObjects[i];
        this.size--;
      }

      for (i in selectorObjects) {
        selectors.push(selectorObjects[i].selector);
      }
    };

    // Sort by id property handler.
    //
    // a - Selector obj.
    // b - Selector obj.
    //
    // Returns Number.
    function sortById(a, b) {
      return a.id - b.id;
    }

    // Public: Find all matching decendants of the context element.
    //
    // context - An Element
    //
    // Returns Array of {selector, data, elements} matches.
    SelectorSet.prototype.queryAll = function(context) {
      if (!this.selectors.length) {
        return [];
      }

      var matches = {},
        results = [];
      var els = this.querySelectorAll(this.selectors.join(', '), context);

      var i, j, len, len2, el, m, match, obj;
      for (i = 0, len = els.length; i < len; i++) {
        el = els[i];
        m = this.matches(el);
        for (j = 0, len2 = m.length; j < len2; j++) {
          obj = m[j];
          if (!matches[obj.id]) {
            match = {
              id: obj.id,
              selector: obj.selector,
              data: obj.data,
              elements: []
            };
            matches[obj.id] = match;
            results.push(match);
          } else {
            match = matches[obj.id];
          }
          match.elements.push(el);
        }
      }

      return results.sort(sortById);
    };

    // Public: Match element against all selectors in set.
    //
    // el - An Element
    //
    // Returns Array of {selector, data} matches.
    SelectorSet.prototype.matches = function(el) {
      if (!el) {
        return [];
      }

      var i, j, k, len, len2, len3, index, keys, objs, obj, id;
      var indexes = this.activeIndexes,
        matchedIds = {},
        matches = [];

      for (i = 0, len = indexes.length; i < len; i++) {
        index = indexes[i];
        keys = index.element(el);
        if (keys) {
          for (j = 0, len2 = keys.length; j < len2; j++) {
            if ((objs = index.map.get(keys[j]))) {
              for (k = 0, len3 = objs.length; k < len3; k++) {
                obj = objs[k];
                id = obj.id;
                if (!matchedIds[id] && this.matchesSelector(el, obj.selector)) {
                  matchedIds[id] = true;
                  matches.push(obj);
                }
              }
            }
          }
        }
      }

      return matches.sort(sortById);
    };
    /**
     * Holds the SelectorSets for each event type
     * @type {{}}
     */
    const eventTypes = {};

    /**
     * Holds Bus event stacks
     * @type {{}}
     */
    const listeners = {};

    /**
     * Events that don't bubble
     * @type {string[]}
     */
    const nonBubblers = ['mouseenter', 'mouseleave', 'pointerenter', 'pointerleave'];

    /**
     * Make a bus stack if not already created.
     *
     * @param {string} event
     */
    function makeBusStack(event) {
        if (listeners[event] === undefined) {
            listeners[event] = [];
        }
    }

    /**
     * Trigger a bus stack.
     *
     * @param {string} event
     * @param args
     */
    function triggerBus(event, args) {
        if (listeners[event]) {
            for (let i = 0; i < listeners[event].length; i++) {
                listeners[event][i](...args);
            }
        }
    }

    /**
     * Maybe run querySelectorAll if input is a string.
     *
     * @param {HTMLElement|Element|string} el
     * @returns {NodeListOf<Element>}
     */
    function maybeRunQuerySelector(el) {
        return typeof el === 'string' ? document.querySelectorAll(el) : el
    }

    /**
     * Handle delegated events
     *
     * @param {Event} e
     */
    function handleDelegation(e) {
        let matches = traverse(eventTypes[e.type], e.target);

        if (matches.length) {
            for (let i = 0; i < matches.length; i++) {
                for (let i2 = 0; i2 < matches[i].stack.length; i2++) {
                    if (nonBubblers.indexOf(e.type) !== -1) {
                        addDelegateTarget(e, matches[i].delegatedTarget);
                        if (e.target === matches[i].delegatedTarget) {
                            matches[i].stack[i2].data(e);
                        }
                    } else {
                        addDelegateTarget(e, matches[i].delegatedTarget);
                        matches[i].stack[i2].data(e);
                    }
                }
            }
        }
    }

    /**
     * Find a matching selector for delegation
     *
     * @param {SelectorSet} listeners
     * @param {HTMLElement|Element|EventTarget} target
     * @returns {[]}
     */
    function traverse(listeners, target) {
        const queue = [];
        let node = target;

        do {
            if (node.nodeType !== 1) {
                break
            }

            const matches = listeners.matches(node);

            if (matches.length) {
                queue.push({delegatedTarget: node, stack: matches});
            }
        } while ((node = node.parentElement))

        return queue
    }

    /**
     * Add delegatedTarget attribute to dispatched delegated events
     *
     * @param {Event} event
     * @param {HTMLElement|Element} delegatedTarget
     */
    function addDelegateTarget(event, delegatedTarget) {
        Object.defineProperty(event, 'currentTarget', {
            configurable: true,
            enumerable: true,
    		get: () => delegatedTarget
        });
    }

    /**
     * Creates a deep clone of an object.
     *
     * @param object
     * @returns {object|array}
     */
    function clone(object) {
    	return JSON.parse(JSON.stringify(object))
    }



    /**
     * Public API
     */
    class E {
        /**
         * Binds all provided methods to a provided context.
         *
         * @param {object} context
         * @param {string[]} [methods] Optional.
         */
        bindAll(context, methods) {
            if (!methods) {
                methods = Object.getOwnPropertyNames(Object.getPrototypeOf(context));
            }

            for (let i = 0; i < methods.length; i++) {
                context[methods[i]] = context[methods[i]].bind(context);
            }
        }

        /**
    	 * Bind event to a string, NodeList, or element.
    	 *
    	 * @param {string} event
    	 * @param {string|NodeList|HTMLElement|Element|Window|Document|array|function} el
    	 * @param {*} [callback]
    	 * @param {{}|boolean} [options]
    	 */
        on(event, el, callback, options) {
    		const events =  event.split(' ');

            for (let i = 0; i < events.length; i++) {
    			if (typeof el === 'function' && callback === undefined) {
    				makeBusStack(events[i]);
    				listeners[events[i]].push(el);
    				continue
    			}

                if (el.nodeType && el.nodeType === 1 || el === window || el === document) {
                    el.addEventListener(events[i], callback, options);
                    continue
                }

                el = maybeRunQuerySelector(el);

                for (let n = 0; n < el.length; n++) {
                    el[n].addEventListener(events[i], callback, options);
                }
            }
        }

        /**
         * Add a delegated event.
         *
         * @param {string} event
         * @param {string|NodeList|HTMLElement|Element} delegate
         * @param {*} [callback]
         */
        delegate(event, delegate, callback) {
            const events =  event.split(' ');

            for (let i = 0; i < events.length; i++) {
                let map = eventTypes[events[i]];

                if (map === undefined) {
                    map = new SelectorSet();
                    eventTypes[events[i]] = map;

                    if (nonBubblers.indexOf(events[i]) !== -1) {
                        document.addEventListener(events[i], handleDelegation, true);
                    } else {
                        document.addEventListener(events[i], handleDelegation);
                    }
                }

                map.add(delegate, callback);
            }
        }

        /**
         * Remove a callback from a DOM element, or one or all Bus events.
         *
         * @param {string} event
         * @param {string|NodeList|HTMLElement|Element|window|Undefined} [el]
         * @param {*} [callback]
    	 * @param {{}|boolean} [options]
         */
        off(event, el, callback, options) {
            const events =  event.split(' ');

            for (let i = 0; i < events.length; i++) {
    			if (el === undefined) {
    				listeners[events[i]] = [];
    				continue
    			}

    			if (typeof el === 'function') {
    				makeBusStack(events[i]);

    				for (let n = 0; n < listeners[events[i]].length; n++) {
    					if (listeners[events[i]][n] === el) {
    						listeners[events[i]].splice(n, 1);
    					}
    				}
    				continue
    			}

                const map = eventTypes[events[i]];

                if (map !== undefined) {
                    map.remove(el, callback);

                    if (map.size === 0) {
                        delete eventTypes[events[i]];

    					if (nonBubblers.indexOf(events[i]) !== -1) {
    						document.removeEventListener(events[i], handleDelegation, true);
    					} else {
    						document.removeEventListener(events[i], handleDelegation);
    					}
                        continue
                    }
                }

                if (el.removeEventListener !== undefined) {
                    el.removeEventListener(events[i], callback, options);
                    continue
                }

                el = maybeRunQuerySelector(el);

                for (let n = 0; n < el.length;n++) {
                    el[n].removeEventListener(events[i], callback, options);
                }
            }
        }

        /**
         * Emit a DOM or Bus event.
         *
         * @param {string} event
         * @param {...*} args
         */
        emit(event, ...args) {
            triggerBus(event, args);
        }

        /**
         * Return a clone of the delegated event stack for debugging.
         *
         * @returns {{}}
         */
        debugDelegated() {
            return clone(eventTypes)
        }

        /**
         * Return a clone of the bus event stack for debugging.
         *
         * @returns {array}
         */
        debugBus() {
            return clone(listeners)
        }
    }

    const instance = new E();
    /* harmony default export */ var src_e = (instance);
    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




    class Events {
      constructor(options = {}) {
        _defineProperty(this, "onRaf", () => {
          src_e.emit(Events.INTERNALRAF);
          if (this.options.disableRaf) return;
          requestAnimationFrame(this.onRaf);
        });

        this.options = options;
        this.addEvents();
      }

      addEvents() {
        if (!this.options.disableRaf) {
          requestAnimationFrame(this.onRaf);
        }

        if (!this.options.disableResize) {
          src_e.on('resize', window, debounce_default()(() => {
            this.onResize();
          }, 150));
        }

        this.onScroll();

        if ('ontouchstart' in document.documentElement) {
          (store_default()).isTouch = true; // touch has been detected in the browser, but let's check for a mouse input

          this.detectMouse();
        }
      }

      onScroll() {
        src_e.on('wheel', window, e => {
          src_e.emit(Events.WHEEL, {
            event: e
          });
        }, {
          passive: false
        });
        src_e.on('scroll', window, e => {
          src_e.emit(Events.INTERNALSCROLL, {
            event: e
          });
        }, {
          passive: true
        });
      }

      onResize({
        width,
        height
      } = {}) {
        (store_default()).window.w = width || window.innerWidth;
        (store_default()).window.h = height || window.innerHeight;
        src_e.emit(Events.RESIZE);
      }

      detectMouse() {
        window.addEventListener('mousemove', function detectMouse(e) {
          if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
            // mouse has moved on touch screen, not just a tap firing mousemove
            (store_default()).isTouch = false;
            src_e.emit(Events.MOUSEDETECTED);
            window.removeEventListener('mousemove', detectMouse);
          }
        });
      }

    }

    _defineProperty(Events, "INTERNALRAF", 'raf:internal');

    _defineProperty(Events, "EXTERNALRAF", 'raf:external');

    _defineProperty(Events, "WHEEL", 'wheel');

    _defineProperty(Events, "INTERNALSCROLL", 'scroll:internal');

    _defineProperty(Events, "EXTERNALSCROLL", 'scroll:external');

    _defineProperty(Events, "RESIZE", 'resize');

    _defineProperty(Events, "MOUSEDETECTED", 'mouseDetected');

    _defineProperty(Events, "SCROLLEND", 'scrollEnd');
    function Scrollbar_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




    class Scrollbar {
      constructor(controller) {
        Scrollbar_defineProperty(this, "onMouseMove", e => {
          if (!this.mouseDown) return;
          this.mousePos = e.clientY;
          this.position -= this.prevMousePos - this.mousePos;
          this.position = Math.min(Math.max(this.position, 0), this.maxY);
          this.prevMousePos = this.mousePos;
          this.controller.targetPos = this.position / this.maxY * this.controller.maxScroll;
          this.controller.clamp();
          this.controller.syncScroll = true;
          this.transform();
          src_e.emit(Events.EXTERNALSCROLL, -this.controller.targetPos);
        });

        Scrollbar_defineProperty(this, "onMouseDown", e => {
          this.mousePos = this.prevMousePos = e.clientY;
          this.mouseDown = true;
          (store_default()).body.style.userSelect = 'none';
          this.el.classList.add('active');
        });

        Scrollbar_defineProperty(this, "onMouseUp", () => {
          this.mouseDown = false;
          store_default().body.style.removeProperty('user-select');
          this.el.classList.remove('active');
        });

        this.controller = controller;
        this.addHTML();
        this.el = document.querySelector(this.controller.options.scrollbarEl);
        this.handle = document.querySelector(this.controller.options.scrollbarHandleEl);
        this.position = 0;
        this.mousePos = 0;
        this.prevMousePos = 0;
        this.addStyles();
        this.addEvents();
      }

      transform() {
        let y;

        if (this.mouseDown) {
          y = this.position;
        } else {
          y = -this.controller.targetPos / -this.controller.maxScroll * ((store_default()).window.h - this.handleHeight);
          this.position = y;
        }

        this.handle.style.transform = `translate3d(0, ${y}px, 0)`;
      }

      show() {
        this.el.classList.add('show');
      }

      hide() {
        this.el.classList.remove('show');
      }

      addEvents() {
        src_e.on('mousedown', this.handle, this.onMouseDown);
        src_e.on('mousemove', window, this.onMouseMove);
        src_e.on('mouseup', window, this.onMouseUp);
      }

      onResize() {
        this.scale = (-this.controller.maxScroll + (store_default()).window.h) / (store_default()).window.h;

        if (this.scale <= 1) {
          this.handle.style.height = 0;
          return;
        }

        this.trueSize = (store_default()).window.h / this.scale;
        this.handleHeight = Math.max(this.trueSize, 40);
        this.handle.style.height = `${this.handleHeight}px`;
        this.maxY = (store_default()).window.h - this.handleHeight;
      }

      addHTML() {
        if (document.querySelector(this.controller.options.scrollbarEl)) return;
        const div = document.createElement('div');
        div.classList.add(this.controller.options.scrollbarEl.substring(1));
        div.innerHTML = `<div class="${this.controller.options.scrollbarHandleEl.substring(1)}"><div></div></div>`;
        document.body.appendChild(div);
      }

      addStyles() {
        if (!this.controller.options.disableNativeScrollbar && !this.controller.options.scrollbarStyles) return;
        let styles = '';

        if (this.controller.options.disableNativeScrollbar) {
          styles += `html{scrollbar-width:none;}body{-ms-overflow-style:none;}body::-webkit-scrollbar{width:0;height:0;}`;
        }

        if (this.controller.options.scrollbarStyles) {
          styles += `${this.controller.options.scrollbarEl} {position:fixed;top:0;right:0;width:20px;height:100%;z-index:900;}.is-touch ${this.controller.options.scrollbarEl} {display:none;}${this.controller.options.scrollbarEl} > div {padding:6px 0;width:10px;height:0;margin:0 auto;visibility:hidden;}${this.controller.options.scrollbarEl} > div > div {width:100%;height:100%;border-radius:10px;opacity:0.3;background-color:#000;}${this.controller.options.scrollbarEl} > div > div:hover {opacity:0.9;}${this.controller.options.scrollbarEl}:hover > div, ${this.controller.options.scrollbarEl}.show > div, ${this.controller.options.scrollbarEl}.active > div {visibility:visible;}${this.controller.options.scrollbarEl}.active > div > div {opacity:0.9;}`;
        }

        const css = document.createElement('style');
        if (css.styleSheet) css.styleSheet.cssText = styles;else css.appendChild(document.createTextNode(styles));
        document.getElementsByTagName("head")[0].appendChild(css);
      }

      destroy() {
        src_e.off('mousedown', this.handle, this.onMouseDown);
        src_e.off('mousemove', window, this.onMouseMove);
        src_e.off('mouseup', window, this.onMouseUp);
      }

    }
    function Controller_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }





    class Controller {
      constructor(options = {}) {
        Controller_defineProperty(this, "onScroll", ({
          event
        }) => {
          if (!this.scrolling) {
            this.toggleIframes();
            this.scrolling = true;
          }

          const prevTargetPos = this.targetPos;

          if (!(store_default()).isTouch && event.type === 'wheel') {
            event.preventDefault();
            this.syncScroll = true;
            this.wheeling = true;
            this.targetPos += event.deltaY * -1;
          } else {
            if (this.preventResizeScroll) {
              this.preventResizeScroll = false;
              return;
            }

            if (this.wheeling) {
              return;
            }

            if ((store_default()).isTouch && this.options.touchScrollType === 'scrollTop') {
              this.targetPos = this.horizontalScroll ? -this.containerElement.scrollLeft : -this.containerElement.scrollTop;
            } else {
              this.targetPos = -window.scrollY;
            }

            if ((store_default()).isTouch && this.options.touchScrollType !== 'transform') {
              this.currentPos = this.targetPos;
            }
          }

          this.clamp();

          if (prevTargetPos !== this.targetPos) {
            src_e.emit(Events.EXTERNALSCROLL, -this.targetPos);

            if (this.options.customScrollbar) {
              this.scrollbar.show();
            }
          }

          this.options.customScrollbar && this.scrollbar.transform();
        });

        Controller_defineProperty(this, "onRAF", () => {
          if (this.testFps && this.options.limitLerpRate) {
            this.time = performance.now() * 0.001;
            this.delta = Math.min((this.time - this.startTime) * 60, 1);
            this.startTime = this.time;
          }

          if (!this.render) return;

          if (Math.abs(this.targetPos - this.currentPos) < 0.5) {
            this.currentPos = this.targetPos;

            if (this.scrolling && !this.syncScroll) {
              this.scrolling = false;
              this.options.customScrollbar && this.scrollbar.hide();
              this.toggleIframes(true);
              src_e.emit(Events.SCROLLEND, -this.targetPos);
            }

            if (this.syncScroll) {
              window.scrollTo(0, -this.targetPos);
              this.syncScroll = false;
              this.wheeling = false;
            }
          } else {
            this.currentPos += (this.targetPos - this.currentPos) * this.ease * this.delta;
          }

          const x = this.horizontalScroll ? this.currentPos : 0;
          const y = this.horizontalScroll ? 0 : this.currentPos;
          this.applyTransform(x, y);
          src_e.emit(Events.EXTERNALRAF, {
            targetPos: -this.targetPos,
            currentPos: -this.currentPos
          });
        });

        Controller_defineProperty(this, "onResize", () => {
          if (this.scrollElementsLength > 1) {
            const lastTarget = this.scrollElements[this.scrollElementsLength - 1];
            const compStyle = window.getComputedStyle(lastTarget);
            const marginOffset = parseFloat(this.horizontalScroll ? compStyle.marginRight : compStyle.marginBottom);
            const bcr = lastTarget.getBoundingClientRect();
            const endPosition = this.horizontalScroll ? bcr.right : bcr.bottom;
            this.scrollLength = endPosition + marginOffset - this.currentPos;
          } else {
            this.scrollLength = this.horizontalScroll ? this.scrollElements[0].scrollWidth : this.scrollElements[0].scrollHeight;
          }

          const windowSize = this.horizontalScroll ? (store_default()).window.w : (store_default()).window.h;
          this.maxScroll = this.scrollLength > windowSize ? -(this.scrollLength - windowSize) : 0;
          this.clamp();

          if (!this.firstResize) {
            this.preventResizeScroll = true;
          }

          (store_default()).body.style.height = this.scrollLength + 'px';
          this.options.customScrollbar && this.scrollbar.onResize();
          this.firstResize = false;
        });

        Controller_defineProperty(this, "toggleFixedContainer", () => {
          this.containerElement.style.position = 'static';
          const scrollPos = this.currentPos;
          this.applyTransform(0, 0);
          requestAnimationFrame(() => {
            this.containerElement.style.position = 'fixed';
            const x = this.horizontalScroll ? scrollPos : 0;
            const y = this.horizontalScroll ? 0 : scrollPos;
            this.applyTransform(x, y);
          });
        });

        this.options = options;
        this.targetPos = this.currentPos = this.prevScrollPos = this.maxScroll = 0;
        this.enabled = false;
        this.render = false;
        this.scrolling = false;
        this.wheeling = false;
        this.syncScroll = false;
        this.horizontalScroll = false;
        this.firstResize = true;
        this.preventResizeScroll = false;
        this.nativeScroll = true;
        this.ease = (store_default()).isTouch ? this.options.touchEase : this.options.ease;
        this.originalScrollbarSetting = this.options.customScrollbar;
        this.testFps = true;
        this.delta = 1;
        this.time = this.startTime = performance.now();
        this.setElements();

        if ((store_default()).isTouch) {
          this.options.customScrollbar = false;

          if (this.options.touchScrollType === 'transform') {
            this.setupSmoothScroll();
          } else if (this.options.touchScrollType === 'scrollTop') {
            document.documentElement.classList.add('asscroll-touch');
            this.addTouchStyles();
            src_e.on('scroll', this.containerElement, e => {
              src_e.emit(Events.INTERNALSCROLL, {
                event: e
              });
            }, {
              passive: true
            });
          }
        } else {
          this.setupSmoothScroll();
        }

        this.addEvents();
      }

      setElements() {
        this.containerElement = typeof this.options.containerElement === 'string' ? document.querySelector(this.options.containerElement) : this.options.containerElement;

        if (this.containerElement === null) {
          console.error('ASScroll: could not find container element');
        }

        this.containerElement.setAttribute('asscroll-container', '');
        this.scrollElements = typeof this.options.scrollElements === 'string' ? document.querySelectorAll(this.options.scrollElements) : this.options.scrollElements;
        if (this.scrollElements.length) this.scrollElements = [...this.scrollElements];
        this.scrollElements = this.scrollElements.length ? this.scrollElements : [this.containerElement.firstElementChild];
        this.scrollElementsLength = this.scrollElements.length;
        this.scrollElements.forEach(el => el.setAttribute('asscroll', ''));
      }

      setupSmoothScroll() {
        this.nativeScroll = false;
        Object.assign(this.containerElement.style, {
          position: 'fixed',
          top: '0px',
          left: '0px',
          width: '100%',
          height: '100%',
          contain: 'content'
        });

        if (this.options.customScrollbar) {
          this.scrollbar = new Scrollbar(this);
        }

        src_e.on(Events.INTERNALRAF, this.onRAF);
        src_e.on(Events.RESIZE, this.onResize);

        if (this.options.limitLerpRate) {
          setTimeout(() => {
            this.testFps = false;
            this.delta = Math.round(this.delta * 10) * 0.1;
          }, 2000);
        }
      }

      applyTransform(x, y) {
        for (let i = 0; i < this.scrollElementsLength; i++) {
          this.scrollElements[i].style.transform = `translate3d(${x}px, ${y}px, 0px)`;
        }
      }

      enable({
        newScrollElements = false,
        reset = false,
        restore = false,
        horizontalScroll = false
      } = {}) {
        if (this.enabled) return;
        this.enabled = true;
        this.render = true;
        this.horizontalScroll = horizontalScroll;

        if (newScrollElements) {
          this.scrollElements = newScrollElements.length ? [...newScrollElements] : [newScrollElements];
          this.scrollElementsLength = this.scrollElements.length;
          this.scrollElements.forEach(el => el.setAttribute('asscroll', ''));
        }

        this.iframes = this.containerElement.querySelectorAll('iframe');

        if ((store_default()).isTouch && this.options.touchScrollType !== 'transform') {
          if (this.options.touchScrollType === 'scrollTop') {
            this.containerElement.style.removeProperty('overflow');
          }

          this.maxScroll = -this.containerElement.scrollHeight;

          if (reset) {
            this.targetPos = this.currentPos = 0;
            this.scrollTo(0, false);
          }
        } else {
          this.firstResize = true;

          if (reset) {
            this.targetPos = this.currentPos = 0;
            this.applyTransform(0, 0);
          }

          this.onResize();
        }

        if (restore) {
          this.scrollTo(this.prevScrollPos, false);
        }

        src_e.on(Events.WHEEL, this.onScroll);
        src_e.on(Events.INTERNALSCROLL, this.onScroll);
      }

      disable({
        inputOnly = false
      } = {}) {
        if (!this.enabled) return;
        this.enabled = false;

        if (!inputOnly) {
          this.render = false;
        }

        src_e.off(Events.WHEEL, this.onScroll);
        src_e.off(Events.INTERNALSCROLL, this.onScroll);
        this.prevScrollPos = this.targetPos;

        if ((store_default()).isTouch && this.options.touchScrollType === 'scrollTop') {
          this.containerElement.style.overflow = 'hidden';
        } else {
          (store_default()).body.style.height = '0px';
        }
      }

      clamp() {
        this.targetPos = Math.max(Math.min(this.targetPos, 0), this.maxScroll);
      }

      scrollTo(y, emitEvent = true) {
        this.targetPos = y;

        if ((store_default()).isTouch && this.options.touchScrollType !== 'transform') {
          if (this.options.touchScrollType === 'scrollTop') {
            if (this.horizontalScroll) {
              this.containerElement.scrollTo(-this.targetPos, 0);
            } else {
              this.containerElement.scrollTo(0, -this.targetPos);
            }
          } else {
            window.scrollTo(0, -this.targetPos);
          }
        }

        this.clamp();
        this.syncScroll = true;
        if (emitEvent) src_e.emit(Events.EXTERNALSCROLL, -this.targetPos);
      }

      toggleIframes(enable) {
        for (let i = 0; i < this.iframes.length; i++) {
          this.iframes[i].style.pointerEvents = enable ? 'auto' : 'none';
        }
      }

      blockScrollEvent(e) {
        e.stopPropagation();
      }

      addEvents() {
        // enable smooth scroll if mouse is detected
        src_e.on(Events.MOUSEDETECTED, () => {
          if (this.options.touchScrollType === 'transform') return;
          this.options.customScrollbar = this.originalScrollbarSetting;
          this.ease = this.options.ease;
          this.setupSmoothScroll();
          this.onResize();
        });

        if (!(store_default()).isTouch) {
          src_e.on('mouseleave', document, () => {
            window.scrollTo(0, -this.targetPos);
          });
          src_e.on('keydown', window, e => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End' || e.key === 'Tab') {
              window.scrollTo(0, -this.targetPos);
            }

            if (e.key === 'Tab') {
              this.toggleFixedContainer();
            }
          });
          src_e.delegate('click', 'a[href^="#"]', this.toggleFixedContainer);
          src_e.delegate('wheel', this.options.blockScrollClass, this.blockScrollEvent);
        }
      }

      addTouchStyles() {
        const styles = `.asscroll-touch [asscroll-container] {position:absolute;top:0;left:0;right:0;bottom:-0.1px;overflow-y: auto;} .asscroll-touch [asscroll] {margin-bottom:0.1px;}`;
        const css = document.createElement('style');
        if (css.styleSheet) css.styleSheet.cssText = styles;else css.appendChild(document.createTextNode(styles));
        document.getElementsByTagName("head")[0].appendChild(css);
      }

    }
    function src_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




    /**
    * Ash's Smooth Scroll 🍑
    */

    class ASScroll {
      /**
      * Creates an ASScroll instance
      *
      * @typicalname asscroll
      * @param {object} [parameters]
      * @param {string|HTMLElement} [parameters.containerElement=[asscroll-container]] The selector string for the outer container element, or the element itself
      * @param {string|HTMLElement|NodeList} [parameters.scrollElements=[asscroll]] The selector string for the elements to scroll, or the elements themselves
      * @param {number} [parameters.ease=0.075] The ease amount for the transform lerp
      * @param {number} [parameters.touchEase=1] The ease amount for the transform lerp on touch devices
      * @param {string} [parameters.touchScrollType=none] Set the scrolling method on touch devices. Other options are 'transform' and 'scrollTop'. See the [Touch Devices](#touch-devices) section for more info
      * @param {string} [parameters.scrollbarEl=.asscrollbar] The selector string for the custom scrollbar element
      * @param {string} [parameters.scrollbarHandleEl=.asscrollbar__handle] The selector string for the custom scrollbar handle element
      * @param {boolean} [parameters.customScrollbar=true] Toggle the custom scrollbar
      * @param {boolean} [parameters.scrollbarStyles=true] Include the scrollbar CSS via Javascript
      * @param {boolean} [parameters.disableNativeScrollbar=true] Disable the native browser scrollbar
      * @param {boolean} [parameters.disableRaf=false] Disable internal requestAnimationFrame loop in order to use an external one
      * @param {boolean} [parameters.disableResize=false] Disable internal resize event on the window in order to use an external one
      * @param {boolean} [parameters.limitLerpRate=true] Match lerp speed on >60Hz displays to that of a 60Hz display
      * @param {string} [parameters.blockScrollClass=.asscroll-block] The class to add to elements that should block ASScroll when hovered
      */
      constructor(_parameters = {}) {
        src_defineProperty(this, "update", () => {
          this.events.onRaf();
        });

        src_defineProperty(this, "resize", parameters => {
          this.events.onResize(parameters);
        });

        const {
          containerElement = '[asscroll-container]',
          scrollElements = '[asscroll]',
          ease = 0.075,
          touchEase = 1,
          touchScrollType = 'none',
          scrollbarEl = '.asscrollbar',
          scrollbarHandleEl = '.asscrollbar__handle',
          customScrollbar = true,
          scrollbarStyles = true,
          disableNativeScrollbar = true,
          disableRaf = false,
          disableResize = false,
          limitLerpRate = true,
          blockScrollClass = '.asscroll-block'
        } = _parameters;
        this.events = new Events({
          disableRaf,
          disableResize
        });
        this.controller = new Controller({
          containerElement,
          scrollElements,
          ease,
          touchEase,
          customScrollbar,
          scrollbarEl,
          scrollbarHandleEl,
          scrollbarStyles,
          disableNativeScrollbar,
          touchScrollType,
          limitLerpRate,
          blockScrollClass
        });
      }
      /**
      * Enable ASScroll.
      *
      * @example <caption>Enables ASScroll on the '.page' element and resets the scroll position to 0</caption>
      * asscroll.enable({ newScrollElements: document.querySelector('.page'), reset: true })
      *
      * @example <caption>Enables ASScroll and restores to the previous position before ASScroll.disable() was called</caption>
      * asscroll.enable({ restore: true })
      *
      * @param {object} [parameters]
      * @param {boolean|NodeList|HTMLElement} [parameters.newScrollElements=false] Specify the new element(s) that should be scrolled
      * @param {boolean} [parameters.reset=false] Reset the scroll position to 0
      * @param {boolean} [parameters.restore=false] Restore the scroll position to where it was when disable() was called
      * @param {boolean} [parameters.horizontalScroll=false] Toggle horizontal scrolling
      */


      enable(parameters) {
        if (parameters !== undefined && typeof parameters !== 'object') {
          console.warn('ASScroll: Please pass an object with your parameters. Since 2.0');
        }

        this.controller.enable(parameters);
      }
      /**
      * Disable ASScroll.
      *
      * @example <caption>Disables the ability to manually scroll whilst still allowing position updates to be made via asscroll.currentPos, for example</caption>
      * asscroll.disable({ inputOnly: true })
      *
      * @param {object} [parameters]
      * @param {boolean} [parameters.inputOnly=false] Only disable the ability to manually scroll (still allow transforms)
      */


      disable(parameters) {
        if (parameters !== undefined && typeof parameters !== 'object') {
          console.warn('ASScroll: Please pass an object with your parameters. Since 2.0');
        }

        this.controller.disable(parameters);
      }
      /**
      * Call the internal animation frame request callback.
      * @function
      */


      /**
      * Add an event listener.
      *
      * @example <caption>Logs out the scroll position when the 'scroll' event is fired</caption>
      * asscroll.on('scroll', scrollPos => console.log(scrollPos))
      *
      * @example <caption>Returns the target scroll position and current scroll position during the internal update loop</caption>
      * asscroll.on('update', ({ targetPos, currentPos }) => console.log(targetPos, currentPos))
      *
      * @example <caption>Fires when the lerped scroll position has reached the target position</caption>
      * asscroll.on('scrollEnd', scrollPos => console.log(scrollPos))
      *
      * @param {string} eventName Name of the event you wish to listen for
      * @param {function} callback Callback function that should be executed when the event fires
      */
      on(eventName, callback) {
        if (typeof callback !== 'function') {
          console.error('ASScroll: Function not provided as second parameter');
          return;
        }

        if (eventName === 'scroll') {
          src_e.on(Events.EXTERNALSCROLL, callback);
          return;
        }

        if (eventName === 'update') {
          src_e.on(Events.EXTERNALRAF, callback);
          return;
        }

        if (eventName === 'scrollEnd') {
          src_e.on(Events.SCROLLEND, callback);
          return;
        }

        console.warn(`ASScroll: "${eventName}" is not a valid event`);
      }
      /**
      * Remove an event listener.
      * @param {string} eventName Name of the event
      * @param {function} callback Callback function
      */


      off(eventName, callback) {
        if (typeof callback !== 'function') {
          console.error('ASScroll: Function not provided as second parameter');
          return;
        }

        if (eventName === 'scroll') {
          src_e.off(Events.EXTERNALSCROLL, callback);
          return;
        }

        if (eventName === 'update') {
          src_e.off(Events.EXTERNALRAF, callback);
          return;
        }

        if (eventName === 'scrollEnd') {
          src_e.off(Events.SCROLLEND, callback);
          return;
        }

        console.warn(`ASScroll: "${eventName}" is not a valid event`);
      }
      /**
      * Scroll to a given position on the page.
      * @param {number} targetPos Target scroll position
      * @param {boolean} [emitEvent=true] Whether to emit the external scroll events or not
      */


      scrollTo(targetPos, emitEvent = true) {
        this.controller.scrollTo(-targetPos, emitEvent);
      }
      /**
      * Returns the target scroll position.
      *
      * @return {number} Target scroll position
      */


      get targetPos() {
        return -this.controller.targetPos;
      }
      /**
      * Gets or sets the current scroll position.
      *
      * @example <caption>Sets the scroll position to 200, bypassing any lerps</caption>
      * asscroll.currentPos = 200
      *
      * @param {number} scrollPos The desired scroll position
      * @return {number} Current scroll position
      */


      get currentPos() {
        return -this.controller.currentPos;
      }

      set currentPos(scrollPos) {
        this.controller.targetPos = this.controller.currentPos = -scrollPos;
      }
      /**
      * Returns the maximum scroll height of the page.
      * @return {number} Maxmium scroll height
      */


      get maxScroll() {
        return -this.controller.maxScroll;
      }
      /**
       * Returns the outer element that ASScroll is attached to.
       * @return {HTMLElement} The outer element
       */


      get containerElement() {
        return this.controller.containerElement;
      }
      /**
       * Returns the the element(s) that ASScroll is scrolling.
       * @return {Array} An array of elements ASScroll is scrolling
       */


      get scrollElements() {
        return this.controller.scrollElements;
      }
      /**
       * Returns whether or not ASScroll is in horizontal scroll mode
       * @return {boolean} The status of horizontal scroll
       */


      get isHorizontal() {
        return this.controller.horizontalScroll;
      }
      /**
       * Returns whether or not ASScroll is actively transforming the page element(s). For example, would return false if running on a touch device and touchScrollType !== 'transform', or if ASScroll was currently disabled via the .disable() method.
       * @return {boolean} The status of actively controlling the page scroll
       */


      get isScrollJacking() {
        return !this.controller.nativeScroll && this.controller.enabled;
      }
      /**
       * @deprecated since 2.0.0 - use targetPos instead
       * @see {@link ASScroll#targetPos}
       */


      get scrollPos() {}
      /**
       * @deprecated since 2.0.0 - use currentPos instead
       * @see {@link ASScroll#currentPos}
       */


      get smoothScrollPos() {}
      /**
       * @deprecated since 2.0.0 - use update() instead
       * @see {@link ASScroll#update}
       */


      onRaf() {}
      /**
       * @deprecated since 2.0.0 - use resize() instead
       * @see {@link ASScroll#resize}
       */


      onResize() {}

    }

    /* harmony default export */ var src = (ASScroll);
    }();
    __webpack_exports__ = __webpack_exports__.default;
    /******/ 	return __webpack_exports__;
    /******/ })()
    ;
    });
    });

    var ASScroll = /*@__PURE__*/getDefaultExportFromCjs(asscroll);

    /* src/App.svelte generated by Svelte v3.48.0 */
    const file = "src/App.svelte";

    // (19:8) <Route path="projets/:slug" let:params>
    function create_default_slot_1(ctx) {
    	let project;
    	let current;

    	project = new Project({
    			props: { slug: /*params*/ ctx[2].slug },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(project.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(project.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(project, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const project_changes = {};
    			if (dirty & /*params*/ 4) project_changes.slug = /*params*/ ctx[2].slug;
    			project.$set(project_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(project.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(project.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(project, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(19:8) <Route path=\\\"projets/:slug\\\" let:params>",
    		ctx
    	});

    	return block;
    }

    // (17:4) <Router {url}>
    function create_default_slot(ctx) {
    	let route0;
    	let t;
    	let route1;
    	let current;

    	route0 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: {
    				path: "projets/:slug",
    				$$slots: {
    					default: [
    						create_default_slot_1,
    						({ params }) => ({ 2: params }),
    						({ params }) => params ? 4 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route0.$$.fragment);
    			t = space();
    			create_component(route1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(route0.$$.fragment, nodes);
    			t = claim_space(nodes);
    			claim_component(route1.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_hydration_dev(target, t, anchor);
    			mount_component(route1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route1_changes = {};

    			if (dirty & /*$$scope, params*/ 12) {
    				route1_changes.$$scope = { dirty, ctx };
    			}

    			route1.$set(route1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(route1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(17:4) <Router {url}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(router.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { "asscroll-container": true });
    			var div_nodes = children(div);
    			claim_component(router.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "asscroll-container", "");
    			add_location(div, file, 15, 0, 386);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			mount_component(router, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope*/ 8) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $asscroll;
    	validate_store(asscroll$1, 'asscroll');
    	component_subscribe($$self, asscroll$1, $$value => $$invalidate(1, $asscroll = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { url = "" } = $$props;

    	onMount(() => {
    		set_store_value(asscroll$1, $asscroll = new ASScroll(), $asscroll);
    	});

    	const writable_props = ['url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Router,
    		Route,
    		Home,
    		Project,
    		ASScroll,
    		asscroll: asscroll$1,
    		url,
    		$asscroll
    	});

    	$$self.$inject_state = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        hydrate: true,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
