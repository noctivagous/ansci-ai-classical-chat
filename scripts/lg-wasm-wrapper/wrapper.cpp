// wrapper.cpp — minimal JSON parse API over the Link Grammar C library.
//
// Exposes two functions to JavaScript (via embind):
//   init()  — load the embedded English dictionary (idempotent).
//   parse(sentence) — parse one sentence, return a JSON string:
//     {"ok":true,"words":[...],"links":[{"left":i,"right":j,"label":"S"}],
//      "linkages":N}
//   or {"ok":false,"error":"..."} when parsing fails.
//
// The English dictionary is embedded at build time with
//   --embed-file <stage>/lgdict@/lgdict
// so no external files are needed at runtime.

#include <cstdio>
#include <sstream>
#include <string>

#include <link-grammar/link-includes.h>
#include <emscripten/bind.h>

namespace {

Dictionary g_dict = nullptr;
Parse_Options g_opts = nullptr;

/* Strip a trailing morphology-guess annotation such as
 * "York[!<capitalized-words>]". The annotation is display metadata,
 * not part of the token; the native CLI's link reader likewise
 * reports the bare token. A leading bracket marks a null-linked
 * word ("[though]") and is preserved. */
static std::string display_word(const char *w) {
	std::string s = w ? w : "";
	// Shorten morphology-guess annotations ("[!<reason>]") to the
	// CLI's display form ("[!]"), wherever they occur: trailing
	// ("York[!<capitalized-words>]") or ahead of the subscript
	// ("life-long[!<hyphenated-words>].a"). A leading bracket marks
	// a null-linked word ("[though]") and is kept.
	std::string::size_type p = 0;
	while ((p = s.find("[!", p)) != std::string::npos && p > 0) {
		std::string::size_type q = s.find(']', p + 2);
		if (q == std::string::npos) break;
		s.replace(p, q - p + 1, "[!]");
		p += 3;
	}
	return s;
}

void json_escape_into(std::ostringstream &out, const char *s) {
	if (!s) return;
	for (const unsigned char *p = (const unsigned char *)s; *p; ++p) {
		switch (*p) {
		case '"': out << "\\\""; break;
		case '\\': out << "\\\\"; break;
		case '\n': out << "\\n"; break;
		case '\r': out << "\\r"; break;
		case '\t': out << "\\t"; break;
		default:
			if (*p < 0x20) {
				char buf[8];
				std::snprintf(buf, sizeof(buf), "\\u%04x", *p);
				out << buf;
			} else {
				out << (char)*p;
			}
		}
	}
}

bool ensure_init(std::string &err) {
	if (g_dict) return true;
	dictionary_set_data_dir("/lgdict");
	g_dict = dictionary_create_lang("en");
	if (!g_dict) {
		err = "cannot load English dictionary from /lgdict/en";
		return false;
	}
	g_opts = parse_options_create();
	parse_options_set_verbosity(g_opts, 0);
	/* Match the link-parser CLI defaults (link-parser.c
	 * set_default_parse_options): the bare library defaults
	 * differ (linkage_limit 100 vs 1000, spell guess off vs 7,
	 * unlimited parse time vs 30s). */
	parse_options_set_linkage_limit(g_opts, 1000);
	parse_options_set_max_parse_time(g_opts, 30);
	parse_options_set_spell_guess(g_opts, 7);
	return true;
}

} // namespace

std::string lg_init() {
	std::string err;
	if (!ensure_init(err)) return err;
	return "";
}

std::string lg_parse(const std::string &input) {
	std::string err;
	if (!ensure_init(err)) {
		std::ostringstream out;
		out << "{\"ok\":false,\"error\":\"";
		json_escape_into(out, err.c_str());
		out << "\"}";
		return out.str();
	}

	Sentence sent = sentence_create(input.c_str(), g_dict);
	if (!sent) {
		return "{\"ok\":false,\"error\":\"cannot create sentence\"}";
	}
	/* Mirror the link-parser CLI: parse with no null links first;
	 * when nothing is found, allow null links (panic mode) and
	 * re-parse. Without this, grammatical-but-uncovered sentences
	 * ("i got her number though.") report zero linkages while the
	 * CLI reports null-count linkages. Resources are reset before
	 * each parse because the options (and their timer) are reused
	 * across calls. */
	parse_options_reset_resources(g_opts);
	parse_options_set_min_null_count(g_opts, 0);
	parse_options_set_max_null_count(g_opts, 0);
	int nlinkages = sentence_parse(sent, g_opts);
	if (nlinkages == 0) {
		parse_options_set_min_null_count(g_opts, 1);
		parse_options_set_max_null_count(g_opts, sentence_length(sent));
		parse_options_reset_resources(g_opts);
		nlinkages = sentence_parse(sent, g_opts);
	}
	if (nlinkages <= 0) {
		sentence_delete(sent);
		std::ostringstream out;
		out << "{\"ok\":false,\"error\":\"no linkage found\",\"linkages\":"
		    << nlinkages << "}";
		return out.str();
	}

	Linkage linkage = linkage_create(0, sent, g_opts);
	if (!linkage) {
		sentence_delete(sent);
		return "{\"ok\":false,\"error\":\"cannot create linkage\"}";
	}

	std::ostringstream out;
	out << "{\"ok\":true,\"linkages\":" << sentence_num_linkages_found(sent)
	    << ",\"nullCount\":" << sentence_null_count(sent)
	    << ",\"words\":[";
	int nwords = linkage_get_num_words(linkage);
	for (int i = 0; i < nwords; ++i) {
		if (i) out << ",";
		out << "\"";
		json_escape_into(out, display_word(linkage_get_word(linkage, i)).c_str());
		out << "\"";
	}
	out << "],\"links\":[";
	int nlinks = linkage_get_num_links(linkage);
	for (int i = 0; i < nlinks; ++i) {
		if (i) out << ",";
		out << "{\"left\":" << linkage_get_link_lword(linkage, i)
		    << ",\"right\":" << linkage_get_link_rword(linkage, i)
		    << ",\"label\":\"";
		json_escape_into(out, linkage_get_link_label(linkage, i));
		out << "\"}";
	}
	out << "]}";

	linkage_delete(linkage);
	sentence_delete(sent);
	return out.str();
}

EMSCRIPTEN_BINDINGS(link_grammar) {
	emscripten::function("init", &lg_init);
	emscripten::function("parse", &lg_parse);
}
