package app;
import java.util.*;

/** Minimal JSON reader/writer for this project's request and response objects. */
public final class Json {
    private Json() {}
    public static Map<String,Object> object(String source) {
        Object value = new Parser(source).value();
        if (!(value instanceof Map)) throw new IllegalArgumentException("A JSON object is required");
        @SuppressWarnings("unchecked") Map<String,Object> map = (Map<String,Object>) value;
        return map;
    }
    public static String write(Object value) {
        if (value == null) return "null";
        if (value instanceof String) return quote((String)value);
        if (value instanceof Number || value instanceof Boolean) return value.toString();
        if (value instanceof Map<?,?> map) {
            StringJoiner j = new StringJoiner(",", "{", "}");
            map.forEach((k,v) -> j.add(quote(String.valueOf(k))+":"+write(v)));
            return j.toString();
        }
        if (value instanceof Iterable<?> list) {
            StringJoiner j = new StringJoiner(",", "[", "]");
            for (Object item:list) j.add(write(item));
            return j.toString();
        }
        return quote(value.toString());
    }
    private static String quote(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c:s.toCharArray()) {
            switch(c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default: if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c);
            }
        }
        return b.append('"').toString();
    }
    private static final class Parser {
        final String s; int i=0;
        Parser(String s){this.s=s==null?"":s;}
        Object value(){
            ws(); if(i>=s.length())throw new IllegalArgumentException("Empty JSON");
            char c=s.charAt(i);
            if(c=='{')return obj(); if(c=='[')return arr(); if(c=='"')return str();
            if(s.startsWith("true",i)){i+=4;return true;}
            if(s.startsWith("false",i)){i+=5;return false;}
            if(s.startsWith("null",i)){i+=4;return null;}
            int start=i; while(i<s.length()&&"-+0123456789.eE".indexOf(s.charAt(i))>=0)i++;
            if(start==i)throw new IllegalArgumentException("Invalid JSON value");
            return Double.valueOf(s.substring(start,i));
        }
        Map<String,Object> obj(){
            Map<String,Object> m=new LinkedHashMap<>();i++;ws();if(take('}'))return m;
            do{ws();String k=str();ws();need(':');m.put(k,value());ws();}while(take(','));
            need('}');return m;
        }
        List<Object> arr(){
            List<Object>a=new ArrayList<>();i++;ws();if(take(']'))return a;
            do{a.add(value());ws();}while(take(','));need(']');return a;
        }
        String str(){
            need('"');StringBuilder b=new StringBuilder();
            while(i<s.length()){char c=s.charAt(i++);if(c=='"')return b.toString();
                if(c=='\\'){if(i>=s.length())break;char e=s.charAt(i++);
                    switch(e){case '"':case '\\':case '/':b.append(e);break;case 'n':b.append('\n');break;
                    case 'r':b.append('\r');break;case 't':b.append('\t');break;case 'b':b.append('\b');break;
                    case 'f':b.append('\f');break;case 'u':b.append((char)Integer.parseInt(s.substring(i,i+4),16));i+=4;break;
                    default:throw new IllegalArgumentException("Invalid escape");}
                }else b.append(c);
            }throw new IllegalArgumentException("Unclosed string");
        }
        void ws(){while(i<s.length()&&Character.isWhitespace(s.charAt(i)))i++;}
        boolean take(char c){if(i<s.length()&&s.charAt(i)==c){i++;return true;}return false;}
        void need(char c){ws();if(!take(c))throw new IllegalArgumentException("Expected "+c);}
    }
}
