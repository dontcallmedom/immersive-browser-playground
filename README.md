# Experimenting with an immersive browser for the web

This repository contains experimental code that explores enhancing the web browsing experience in an immersive setting, characterized by the availability of a third dimension and of an extended viewport.

The code was developed by [@dontcallmedom](https://github.com/dontcallmedom) and [@tidoust](https://github.com/tidoust) during W3C's Geek Week 2023. The resulting immersive browsing playground, based on [Electron](https://www.electronjs.org/), is but a proof of concept, and should not be used for any other purpose than demos and experimentations.

*Note: We don't have particular plans to maintain the code.*

## Context

At its heart, the web platform loves text and linear (1D) content. Support for 2D content and 2D layout mechanisms have been added over time (e.g., tables, images, videos, grid layout), with companion mechanisms and best practices to get back to text content and otherwise improve semantics for linear consumption: text alternatives, responsive layout features, progressive enhancement concepts, video captions, accessibility guidelines, etc. This text-first principle helped establish the web as a pervasive platform.

Current approaches to adding 3D content to the web (WebGL, WebGPU) essentially hide it as 2D content rendered into a canvas element, without additional companion mechanisms to convey semantics for now.

One property of the metaverse is that it will progressively turn the web into an immersive-first experience. Typical metaverse scenarios involve users wandering in, and interacting with, 3D environments. These 3D environments tend to be graphical in essence, without much text. Common 3D formats and 3D renderers provide limited support for text layout out of the box, leaving it up to applications to split text into multiple lines for instance.

This creates a hiatus. On the one hand, a web platform that loves (hyper-)text but does not understand 3D. On the other hand, immersive experiences that love 3D but do not understand text. Is there a middle ground?

This exploration is way too limited to answer this question. It explores a couple of related ones:
- Can simple 3D effects enhance browsing experiences of web pages in an immersive setting? Or do they only create nuisance?
- Can browsers leverage the extended viewport to enhance navigation?

## Running the demo

To run the demo:

1. *Prerequisites*. you'll need [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/).
2. *Installation*. Clone this repository and install dependencies through
   ```
   git clone https://github.com/dontcallmedom/immersive-browser-playground.git
   npm install
   ```
3. *Run the demo*. `npm start`.
    You may also provide a URL to the command-line: `npm start https://wikipedia.org/`

The demo loads a basic 3D scene that features a web page rendered into a pane in front of the user, and a few options to toggle features on and off.

![Screenshot of the inital demo view, with a main browsing pane and a set of buttons to toggle features on and off](/media/screenshot-1.jpg)

Available features:

1. **Toggle 3D rendering**: applies/removes 3D effects to the rendered web page to push make some of the content stand out in front of the rest of the page.
2. **Toggle wireframe**: toggles a wireframe around the main pane to show the limits of the 3D effects.
3. **Toggle side image**: toggles a side image pane on the right side of the main one.
4. **Toggle companion nav**: toggles a set of companion navigation panes behind the main one that render most linked pages from the page rendered in the main pane.

For example, once 3D effects and the wireframe are turned on, you should get the following result:

![Screenshot of the demo once 3D effects are on](/media/screenshot-2.jpg)

You may wander into the scene with keyboard arrows and change perspective with the mouse. You may also use the mouse to scroll the main web content and click on links and buttons. Web interactions remain very limited though (e.g., clicking on scroll bars won't do anything, and don't expect any ability to provide input into a form!).

We haven't had time to test the demo with a VR headset. It may work. More likely, it does not!

**Overall, don't expect anything polished, the demo is limited, clunky, and unstable!**

## Demo features

### 3D effects

By definition, an immersive setting adds a third dimension. Can that third dimension be used to enhance the browsing experience of regular 2D pages?

The goal here was to explore ideas raised by Josh Carpenter on [HTML, CSS & VR](https://www.w3.org/2016/06/vr-workshop/minutes.html#h.5ohbhq5c6kwd) in the 2016 [W3C workshop on Web and Virtual Reality](https://www.w3.org/2016/06/vr-workshop/report.html).

For security and privacy reasons, web content should not be allowed to take control of the whole 3D scene. Instead, the idea is to restrict the web page to a 3D box, bounded by the initial 2D pane and some maximum displacement in the third dimension. The web page is then free to position content within the box, ideally through dedicated CSS properties.

For code simplicity, the demo rather reacts to HTML `data-xr-z``attributes in the page to tell which elements need to be displaced in the third dimension, with values ranging from -100 to 100 (interpreted as percentages of displacement within the box).

In the absence of `data-xr-z` attributes, the code applies what could be envisioned as a default user agent style sheet, making headings and images pop out in front of the content.

Implementation notes:

- To create the displacement, a screenshot of the element's bounding box is taken, the element is then hidden, and the screenshot rendered in a pane floating on top of (or behind) the main pane. This is very clunky: screenshot will also capture the element's background, if any, or any content laid out on top of it. Images are handled slightly differently, but any CSS effect applied to the image (e.g., rounded corners) will be missed.
- The displaced panes cast a shadow on the main pane. That may be something worth leaving in the control of the page itself as the result is not always great.
- There is no way to interact with the displaced panes for now.
- The displaced panes don't react to scroll either.

Josh Carpenter also mentions the possibility for a page to request permission to extend beyond its initial box. We haven't had time to explore this further.


### Enhanced navigation

The main pane leaves a lot of space in the 3D scene that browsers could perhaps leverage to enhance the browsing experience.

#### Side image

One possible enhancement that leverages the extra space available could be to feature a contextual image, taken from the page itself on the side of the main pane. This mode works somewhat well with Wikipedia pages for instance, allowing to browse text with (higher resolution) section images on the side.

The code contains custom code for Wikipedia pages in `preload-content.js`. For other pages, the code simply extracts `<img>` tags, which won't yield good results when, e.g., images are used to render icons. Pages could perhaps have a mechanism to flag images that may be featured in a side navigation pane.

#### Side navigation panes

Another possible enhancement that leverages the extra space available could be to create additional navigation panes that render a few companion pages to the main page being rendered. By default, these pages would be the most linked ones from the main page. Pages could perhaps also have a mechanism to flag pages worth featuring as companion pages.

## Implementation notes

- [Electron](https://www.electronjs.org/) is used to load and render the 3D scene, and more importantly to render web pages in the background, which are then applied as textures to panes in the 3D scene. The starting code that runs Electron's main process is in `main.js`.
- [A-Frame](https://aframe.io/) is used to render the basic 3D scene (defined in `browser.html`) and handle user interactions and navigation within the scene.
- The `browser.js` file contains the logic that runs within the A-Frame scene.
- The `preload.js` file handles the interaction between the 3D scene and Electron's main process. 
- The `preload-content.js` file handles the interaction between the web page that is to be rendered in the main pane in the 3D scene and Electron's main process.
- The `home.html` file contains the home page, rendered in the main pane in the 3D scene when the demo starts. The page features a few `data-xr-z` attributes to showcase 3D effects.
- The `content.html` file contains a demo page with `data-xr-z` attributes to showcase 3D effects.

## Struggles / Learnings

### Text and 3D

Our initial goal was to look for possible hooks in common 3D formats ([glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), [X3D](https://www.web3d.org/specifications/X3Dv4Draft/ISO-IEC19775-1v4-IS.proof/Part01/Architecture.html), [USD](https://www.openusd.org/release/index.html)) to improve semantics of 3D scenes so that user agents can play their role of intermediary between users and content in immersive settings as well, and mediate users interaction with the content in particular.

We had not realized that support for text might be a more pressing problem to look at. Support for text is limited in 3D formats (e.g., [X3D Text Component](https://www.web3d.org/specifications/X3Dv4Draft/ISO-IEC19775-1v4-IS.proof/Part01/components/text.html)) or simply absent (e.g., glTF), requiring text to be converted to a texture or a mesh for rendering. This works, but hides the text into an opaque structure.

If the metaverse is to extend the web, we feel that it needs to encompass the web, and even though videos dominate bandwidth consumption these days, the web remains heavily text-based. The question for us thus becomes: how can (hyper-)text content be rendered into a 3D scene? How to perform a copy-and-paste of text in a 3D scene?

We don't have an answer but now appreciate better that it is a hard problem, which explains why WebXR APIs provide limited support for embedding HTML content, restricted to overlays (The [WebXR DOM Overlays Module](https://www.w3.org/TR/webxr-dom-overlays-1/)), and why browsers such as the Meta Quest Browser or the announced Safari for the Vision Pro remain essentially 2D browsers, with a few extensions to better integrate with WebXR APIs (such as [WebXR Layers](https://www.w3.org/TR/webxrlayers-1/)) or to embed 3D graphical content ([The `<model>` element](https://immersive-web.github.io/model-element/) proposal).

The above is a good reminder of how powerful CSS has become at laying out web content in 2D over the years. Longer term, we feel that there needs to be a way to properly (and safely!) embed HTML content within an immersive scene.

### CSS in immersive contexts

CSS already contains 3D-related properties, such as [3D transforms](https://drafts.csswg.org/css-transforms-2/#3d-transform-rendering), and to some extent [`z-index`](https://drafts.csswg.org/css2/#z-index).

If applying 3D effects seems useful, it is unclear to us whether these properties may be leveraged as-is in an immersive context, or whether new ones need to be defined. The existing properties are defined and used to create actual 2D content right now, not 3D content. They may need to be completed somehow for the page to make explicit that it is fine with rendering the underlying elements in actual 3D, e.g. through a media query, or through additional property parameters.

### 3D scenes

Being rookies in 3D authoring, and used to seeing more and more realistic 3D, we had not realized that it remains very easy to create 3D artefacts in what we envisioned would be a simple 3D scene: creating shadows and adding transparency proved harder than what we initially anticipated for instance.

## References

- The past [W3C workshop on Web and Virtual Reality](https://www.w3.org/2016/06/vr-workshop/report.html) in 2016, and notably Josh Carpenter's presentation on [HTML, CSS & VR](https://www.w3.org/2016/06/vr-workshop/minutes.html#h.5ohbhq5c6kwd).
- Apple's [Meet Safari for spatial computing](https://developer.apple.com/videos/play/wwdc2023/10279/) video during WWDC 2023.
- [Introduction to Meta Quest Browser](https://developer.oculus.com/documentation/web/).
- François' keynote speech "W3C and immersive 3D worlds in Web browsers – Evolutions of the Web platform" (see [annotated Google slides](https://docs.google.com/presentation/d/1oGhHnmHVzV4HebsCAFAuGrS4s_3OsrDQaGqQ3wSWFTI/edit)) during the [Web3D 2023](https://web3d.siggraph.org/) conference in San Sebastian.
