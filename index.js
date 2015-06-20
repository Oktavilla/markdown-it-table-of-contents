"use strict";
var string = require("string");
var assign = require("lodash.assign");
var defaults = {
  includeLevel: 2,
  containerTag: "div",
  containerClass: "table-of-contents",
  slugify: function(str) {
    return string(str).slugify().toString();
  }
};

module.exports = function(md, options) {
  var options = assign({}, defaults, options);
  var tocRegexp = /^\[\[toc\]\]/im;
  var gstate;

  function toc(state, silent) {
    var token;
    var match;

    while (state.src.indexOf("\n") >= 0 && state.src.indexOf("\n") < state.src.indexOf("[[toc]]")) {
      if (state.tokens.slice(-1)[0].type === "softbreak") {
        state.src = state.src.split("\n").slice(1).join("\n");
        state.pos = 0;
      }
    }

    // Reject if the token does not start with [
    if (state.src.charCodeAt(state.pos) !== 0x5B /* [ */ ) {
      return false;
    }
    // Don't run any pairs in validation mode
    if (silent) { 
      return false;
    }

    // Detect TOC markdown
    match = tocRegexp.exec(state.src);
    match = !match ? [] : match.filter(function(m) { return m; });
    if (match.length < 1) {
      return false;
    }

    // Build content
    token = state.push("toc_open", "toc", 1);
    token.markup = "[[toc]]";
    token = state.push("toc_body", "", 0);
    token = state.push("toc_close", "toc", -1);

    // Update pos so the parser can continue
    var newline = state.src.indexOf("\n");
    if (newline !== -1) {
      state.pos = state.pos + newline;
    } else {
      state.pos = state.pos + state.posMax + 1;
    }

    return true;
  }

  md.renderer.rules.toc_open = function(tokens, index) {
    if(options.containerClass){
      return "<" + options.containerTag + " class=\"" + options.containerClass + "\">";
    }else{
      return "<" + options.containerTag + ">";
    }
  };

  md.renderer.rules.toc_close = function(tokens, index) {
    return "</" + options.containerTag + ">";
  };

  md.renderer.rules.toc_body = function(tokens, index) {
    var headings = [];
    for (var i = 0, size = gstate.tokens.length; i < size; i++) {
      var token = gstate.tokens[i];
      var heading = gstate.tokens[i - 1];
      if (token.type !== "heading_close" || token.tag.substr(1, 1) != options.includeLevel || heading.type !== "inline") {
        continue; // Skip if not matching criteria
      }
      headings.push("<li><a href=\"#" + options.slugify(heading.content) + "\">" + heading.content + "</a></li>");
    }

    return "<ul>" + headings.join("") + "</ul>";
  };

  // Catch all the tokens for iteration later
  md.core.ruler.push("grab_state", function(state) {
    gstate = state;
  });

  // Insert TOC
  md.inline.ruler.after("emphasis", "toc", toc);
};
