'use strict';
var slugify = function(s){
  return encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-'))
};
var defaults = {
  includeLevel: [ 1, 2 ],
  containerClass: 'table-of-contents',
  slugify: slugify,
  markerPattern: /^\[\[toc\]\]/im,
  listType: 'ul',
  format: function(content, md) {
    return md.renderInline(content);
  },
  forceFullToc: false,
  containerHeaderHtml: undefined,
  containerFooterHtml: undefined,
  transformLink: undefined,
};

module.exports = function(md, o) {
  var options = Object.assign({}, defaults, o);
  var tocRegexp = options.markerPattern;
  var gstate;
  var links;

  function toc(state, silent) {
    var token;
    var match;
    links = [];

    // Reject if the token does not start with [
    if (state.src.charCodeAt(state.pos) !== 0x5B /* [ */ ) {
      return false;
    }
    // Don't run any pairs in validation mode
    if (silent) {
      return false;
    }

    // Detect TOC markdown
    match = tocRegexp.exec(state.src.substr(state.pos));
    match = !match ? [] : match.filter(function(m) { return m; });
    if (match.length < 1) {
      return false;
    }

    // Build content
    token = state.push('toc_open', 'toc', 1);
    token.markup = '[[toc]]';
    token = state.push('toc_body', '', 0);
    token = state.push('toc_close', 'toc', -1);

    // Update pos so the parser can continue
    var newline = state.src.indexOf('\n', state.pos);
    if (newline !== -1) {
      state.pos = newline;
    } else {
      state.pos = state.pos + state.posMax + 1;
    }

    return true;
  }

  md.renderer.rules.toc_open = function(tokens, index) {
    var tocOpenHtml = '<div class="'+ options.containerClass +'">';

    if (options.containerHeaderHtml) {
      tocOpenHtml += options.containerHeaderHtml;
    }

    return tocOpenHtml;
  };

  md.renderer.rules.toc_close = function(tokens, index) {
    var tocFooterHtml = '';

    if (options.containerFooterHtml) {
      tocFooterHtml = options.containerFooterHtml;
    }

    return tocFooterHtml + '</div>';
  };

  md.renderer.rules.toc_body = function(tokens, index) {
    if (options.forceFullToc) {
      throw("forceFullToc was removed in version 0.5.0. For more information, see https://github.com/Oktavilla/markdown-it-table-of-contents/pull/41")
    } else {
      return renderChildsTokens(0, gstate.tokens)[1];
    }
  };

  function renderChildsTokens(pos, tokens) {
    var headings = [],
        buffer = '',
        currentLevel,
        subHeadings,
        size = tokens.length,
        i = pos;
    while(i < size) {
      var token = tokens[i];
      var heading = tokens[i - 1];
      var level = token.tag && parseInt(token.tag.substr(1, 1));
      if (token.type !== 'heading_close' || options.includeLevel.indexOf(level) == -1 || heading.type !== 'inline') {
        i++; continue; // Skip if not matching criteria
      }
      if (!currentLevel) {
        currentLevel = level;// We init with the first found level
      } else {
        if (level > currentLevel) {
          subHeadings = renderChildsTokens(i, tokens);
          buffer += subHeadings[1];
          i = subHeadings[0];
          continue;
        }
        if (level < currentLevel) {
          // Finishing the sub headings
          buffer += "</li>";
          headings.push(buffer);
          return [i, "<"+ options.listType +">"+ headings.join('') +"</"+ options.listType +">"];
        }
        if (level == currentLevel) {
          // Finishing the sub headings
          buffer += "</li>";
          headings.push(buffer);
        }
      }
      var content = heading.children
        .filter((token) => token.type === 'text' || token.type === 'code_inline')
        .reduce((acc, t) => acc + t.content, '');
      var slugifiedContent = options.slugify(content);
      var link = "#"+slugifiedContent;
      if (options.transformLink) {
          link = options.transformLink(link);
      }

      // Check if this link has been generated before and increment link if so
      var generatedLink = link;
      var index = 2;
      while (links.indexOf(generatedLink) >= 0) {
        generatedLink = link + "-" + index++;
      }
      links.push(generatedLink);

      buffer = `<li><a href="${generatedLink}">`;
      buffer += options.format(content, md, generatedLink);
      buffer += `</a>`;
      i++;
    }
    buffer += buffer === '' ? '' : '</li>';
    headings.push(buffer);
    return [i, "<"+ options.listType +">"+ headings.join('') +"</"+ options.listType +">"];
  }

  // Catch all the tokens for iteration later
  md.core.ruler.push('grab_state', function(state) {
    gstate = state;
  });

  // Insert TOC
  md.inline.ruler.after('emphasis', 'toc', toc);
};
