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
	int nlinkages = sentence_parse(sent, g_opts);
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
	    << ",\"words\":[";
	int nwords = linkage_get_num_words(linkage);
	for (int i = 0; i < nwords; ++i) {
		if (i) out << ",";
		out << "\"";
		json_escape_into(out, linkage_get_word(linkage, i));
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
