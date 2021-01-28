"use strict";
var assert = require("assert");
var fs = require("fs");
var MarkdownIt = require("markdown-it");
var markdownItAnchor = require("markdown-it-anchor");
var markdownItTOC = require("../../index");

// Defaults
var defaultContainerClass = "table-of-contents";
var defaultMarker = "[[toc]]";
var defaultListType = "ul";

// Fixtures
var simpleMarkdown = fs.readFileSync("test/fixtures/simple.md", "utf-8");
var simpleWithFormatting = fs.readFileSync("test/fixtures/simple-with-markdown-formatting.md", "utf-8");
var simpleWithFormattingHTML = fs.readFileSync("test/fixtures/simple-with-markdown-formatting.html", "utf-8");
var simpleDefaultHTML = fs.readFileSync("test/fixtures/simple-default.html", "utf-8");
var simple1LevelHTML = fs.readFileSync("test/fixtures/simple-1-level.html", "utf-8");
var simpleWithAnchorsHTML = fs.readFileSync("test/fixtures/simple-with-anchors.html", "utf-8");
var simpleWithHeaderFooterHTML = fs.readFileSync("test/fixtures/simple-with-header-footer.html", "utf-8");
var simpleWithTransformLink = fs.readFileSync("test/fixtures/simple-with-transform-link.html", "utf-8");
var simpleWithHeadingLink = fs.readFileSync("test/fixtures/simple-with-heading-links.md", "utf-8");
var simpleWithHeadingLinkHTML = fs.readFileSync("test/fixtures/simple-with-heading-links.html", "utf-8");
var simpleWithDuplicateHeadings = fs.readFileSync("test/fixtures/simple-with-duplicate-headings.md", "utf-8");
var simpleWithDuplicateHeadingsHTML = fs.readFileSync("test/fixtures/simple-with-duplicate-headings.html", "utf-8");
var emptyMarkdown = defaultMarker;
var emptyMarkdownHtml = fs.readFileSync("test/fixtures/empty.html", "utf-8");
var fullTocSampleMarkdown = fs.readFileSync("test/fixtures/full-toc-sample.md", "utf-8");
var fullTocSampleHtml = fs.readFileSync("test/fixtures/full-toc-sample-result.html", "utf-8");

const slugify = (s) => encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-'));


var endOfLine = require('os').EOL;

function adjustEOL(text) {
  if ('\n'!==endOfLine) {
    text = text.replace( /([^\r])\n/g, '\$1'+endOfLine);
  }
  return text;
}

describe("Testing Markdown rendering", function() {
  var md = new MarkdownIt();

  it("Parses correctly with default settings", function(done) {
    md.use(markdownItTOC);
    assert.equal(adjustEOL(md.render(simpleMarkdown)), simpleDefaultHTML);
    done();
  });

  it("Parses correctly with includeLevel set", function(done) {
    md.use(markdownItTOC, {
      "includeLevel": [2]
    });
    assert.equal(adjustEOL(md.render(simpleMarkdown)), simple1LevelHTML);
    done();
  });

  it("Parses correctly with containerClass set", function(done) {
    var customContainerClass = "custom-container-class";
    md.use(markdownItTOC, {
      "containerClass": customContainerClass
    });
    assert.equal(adjustEOL(md.render(simpleMarkdown)), simpleDefaultHTML.replace(defaultContainerClass, customContainerClass));
    done();
  });

  it("Parses correctly with markerPattern set", function(done) {
    var customMarker = "[[custom-marker]]";
    md.use(markdownItTOC, {
      "markerPattern": /^\[\[custom-marker\]\]/im
    });
    assert.equal(adjustEOL(md.render(simpleMarkdown.replace(defaultMarker, customMarker))), simpleDefaultHTML);
    done();
  });

  it("Parses correctly with listType set", function(done) {
    var customListType = "ol";
    md.use(markdownItTOC, {
      "listType": customListType
    });
    assert.equal(adjustEOL(md.render(simpleMarkdown)), simpleDefaultHTML.replace(new RegExp(defaultListType, "g"), customListType));
    done();
  });

  it("Formats markdown by default", function(done) {
    md.use(markdownItTOC);
    assert.equal(adjustEOL(md.render(simpleWithFormatting)), simpleWithFormattingHTML);
    done();
  });

  it("Parses correctly with custom formatting", function(done) {
    var customHeading = "Heading with custom formatting 123abc";
    md.use(markdownItTOC, {
      format: function(str) { return customHeading; }
    });
    assert.equal(md.render(simpleMarkdown).includes(customHeading), true);
    done();
  });

  it("Custom formatting includes markdown and link", function(done) {
    md.use(markdownItTOC, {
      format: function(str, md, link) {
        assert.ok(MarkdownIt.prototype.isPrototypeOf(md));
        assert.notEqual(link, null);
        return "customHeading";
      }
    });
    assert.equal(md.render(simpleMarkdown).includes("customHeading"), true);
    done();
  });

  it("Slugs matches markdown-it-anchor", function(done) {
    md.use(markdownItAnchor);
    md.use(markdownItTOC);
    assert.equal(adjustEOL(md.render(simpleMarkdown)), simpleWithAnchorsHTML);
    done();
  });

  it("Generates empty TOC", function(done) {
    md.use(markdownItTOC);
    assert.equal(adjustEOL(md.render(emptyMarkdown)), emptyMarkdownHtml);
    done();
  });

  it("Throws an error if forceFullToc is enabled", function (done) {
    md.use(markdownItTOC, {
      forceFullToc: true
    });
    assert.throws(() => md.render(simpleMarkdown), /forceFullToc was removed/);
    done();
  });

  it("Parses correctly with container header and footer html set", function (done) {
    md.use(markdownItTOC,
      {
        slugify,
        containerHeaderHtml: `<div class="header">Contents</div>`,
        containerFooterHtml: `<div class="footer">Footer</div>`,
      });
    assert.equal(adjustEOL(md.render(simpleMarkdown)), simpleWithHeaderFooterHTML);
    done();
  });

  it("Generates TOC, with custom transformed link", function (done) {
    md.use(markdownItTOC,
      {
        slugify,
        transformLink: (href) => {
          return href+"&type=test";
        },
      });
    assert.equal(adjustEOL(md.render(simpleMarkdown)), simpleWithTransformLink);
    done();
  });

  it("Parses correctly when headers are links", function (done) {
    md.use(markdownItTOC);
    assert.equal(adjustEOL(md.render(simpleWithHeadingLink)), simpleWithHeadingLinkHTML);
    done();
  });

  it("Parses correctly with duplicate headers", function (done) {
    md.use(markdownItTOC, {
      "includeLevel": [1,2,3,4]
    });
    assert.equal(adjustEOL(md.render(simpleWithDuplicateHeadings)), simpleWithDuplicateHeadingsHTML);
    done();
  });
});
