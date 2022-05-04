
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
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
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
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

    /* src/App.svelte generated by Svelte v3.48.0 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (35:0) {:catch error}
    function create_catch_block_1(ctx) {
    	let pre;
    	let t_value = /*error*/ ctx[8].message + "";
    	let t;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			t = text(t_value);
    			add_location(pre, file, 36, 4, 1003);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(35:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (16:0) {:then home}
    function create_then_block(ctx) {
    	let h1;
    	let t0_value = asText(/*home*/ ctx[0].data.title) + "";
    	let t0;
    	let t1;
    	let each_1_anchor;
    	let each_value = /*home*/ ctx[0].data.body;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(h1, file, 17, 4, 402);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prismicQuery, loadProject, prismicH*/ 0) {
    				each_value = /*home*/ ctx[0].data.body;
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
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(16:0) {:then home}",
    		ctx
    	});

    	return block;
    }

    // (25:12) {#if item.project.slug}
    function create_if_block(ctx) {
    	let await_block_anchor;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block,
    		value: 7
    	};

    	handle_promise(loadProject(/*item*/ ctx[4].project.slug), info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(25:12) {#if item.project.slug}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script context="module">     import createClient from './lib/prismicClient';     import  * as prismicH from "@prismicio/helpers";          const client = createClient(fetch);     const prismicQuery = client.getFirst();     const loadProject = (slug) => client.getByUID('projects', slug,          { fetchLinks: 'image' }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script context=\\\"module\\\">     import createClient from './lib/prismicClient';     import  * as prismicH from \\\"@prismicio/helpers\\\";          const client = createClient(fetch);     const prismicQuery = client.getFirst();     const loadProject = (slug) => client.getByUID('projects', slug,          { fetchLinks: 'image' }",
    		ctx
    	});

    	return block;
    }

    // (28:16) {:then project}
    function create_then_block_1(ctx) {
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			img = element("img");
    			t = space();
    			if (!src_url_equal(img.src, img_src_value = /*project*/ ctx[7].data.image.url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*project*/ ctx[7].data.image.alt);
    			add_location(img, file, 28, 20, 841);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(28:16) {:then project}",
    		ctx
    	});

    	return block;
    }

    // (26:55)                      <p>Loading...</p>                 {:then project}
    function create_pending_block_1(ctx) {
    	let p;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Loading...";
    			t1 = space();
    			add_location(p, file, 26, 20, 770);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(26:55)                      <p>Loading...</p>                 {:then project}",
    		ctx
    	});

    	return block;
    }

    // (24:8) {#each timelinePiece.items as item}
    function create_each_block_1(ctx) {
    	let if_block_anchor;
    	let if_block = /*item*/ ctx[4].project.slug && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*item*/ ctx[4].project.slug) if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(24:8) {#each timelinePiece.items as item}",
    		ctx
    	});

    	return block;
    }

    // (20:4) {#each home.data.body as timelinePiece}
    function create_each_block(ctx) {
    	let p;
    	let t0_value = asText(/*timelinePiece*/ ctx[1].primary.year) + "";
    	let t0;
    	let t1;
    	let html_tag;
    	let raw_value = asHTML(/*timelinePiece*/ ctx[1].primary.title) + "";
    	let t2;
    	let each_1_anchor;
    	let each_value_1 = /*timelinePiece*/ ctx[1].items;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			html_tag = new HtmlTag(false);
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(p, file, 20, 8, 499);
    			html_tag.a = t2;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			insert_dev(target, t1, anchor);
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, t2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*loadProject, prismicQuery*/ 0) {
    				each_value_1 = /*timelinePiece*/ ctx[1].items;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) html_tag.d();
    			if (detaching) detach_dev(t2);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(20:4) {#each home.data.body as timelinePiece}",
    		ctx
    	});

    	return block;
    }

    // (12:21)       <p>Loading...</p>  {:then home}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Loading...";
    			add_location(p, file, 13, 4, 365);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(12:21)       <p>Loading...</p>  {:then home}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let await_block_anchor;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block_1,
    		value: 0,
    		error: 8
    	};

    	handle_promise(prismicQuery, info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
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

    const client = createClient(fetch);
    const prismicQuery = client.getFirst();
    const loadProject = slug => client.getByUID('projects', slug, { fetchLinks: 'image' });

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createClient,
    		prismicH,
    		client,
    		prismicQuery,
    		loadProject
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
