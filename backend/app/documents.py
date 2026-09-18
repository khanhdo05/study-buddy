"""Bounded document extraction. Website requests never carry Supabase credentials."""
from io import BytesIO
import ipaddress
import socket
from urllib.parse import urlsplit, urljoin
from bs4 import BeautifulSoup
from fastapi import HTTPException
from pypdf import PdfReader
from pptx import Presentation
import urllib3

MAX_BYTES = 10 * 1024 * 1024
MAX_PAGES = 100
MAX_TEXT = 60_000


def public_target(url: str) -> tuple[str, str, str]:
    parts = urlsplit(url)
    if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password or parts.port not in (None, 443):
        raise ValueError('Use a public HTTPS address without credentials or a custom port.')
    host = parts.hostname.encode('idna').decode('ascii')
    addresses = {result[4][0] for result in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)}
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError('Private, loopback, and internal website addresses are not allowed.')
    target = parts.path or '/'
    if parts.query:
        target += '?' + parts.query
    return host, sorted(addresses)[0], target


def fetch_website(url: str) -> tuple[bytes, str]:
    for _ in range(4):
        try:
            host, address, path = public_target(url)
            # Pin the validated address to prevent DNS rebinding, retaining TLS
            # certificate verification and SNI for the original hostname.
            with urllib3.HTTPSConnectionPool(address, port=443, server_hostname=host, assert_hostname=host,
                                            cert_reqs='CERT_REQUIRED', timeout=urllib3.Timeout(connect=5, read=10), retries=False) as pool:
                response = pool.urlopen('GET', path, headers={'Host': host, 'User-Agent': 'StudyBuddy-Syllabus/1.0', 'Accept-Encoding': 'identity'},
                                        redirect=False, preload_content=False, assert_same_host=False)
                try:
                    if response.status in (301, 302, 303, 307, 308):
                        location = response.headers.get('Location')
                        if not location:
                            raise ValueError('The website returned an invalid redirect.')
                        url = urljoin(url, location)
                        continue
                    if response.status != 200:
                        raise ValueError('The website could not be read. Upload a PDF or text export instead.')
                    mime = response.headers.get('Content-Type', '').split(';')[0].lower()
                    if mime not in ('text/html', 'text/plain', 'application/pdf'):
                        raise ValueError('The URL must return an HTML page, plain text, or PDF.')
                    if response.headers.get('Content-Encoding', 'identity') != 'identity':
                        raise ValueError('The website requires compression. Upload a text or PDF export instead.')
                    content = bytearray()
                    for chunk in response.stream(65536, decode_content=False):
                        content.extend(chunk)
                        if len(content) > MAX_BYTES:
                            raise ValueError('The website document is larger than 10 MiB.')
                    return bytes(content), mime
                finally:
                    response.close()
        except (ValueError, OSError, urllib3.exceptions.HTTPError) as exc:
            raise HTTPException(422, str(exc) if isinstance(exc, ValueError) else 'Cannot retrieve that public website.') from exc
    raise HTTPException(422, 'The website redirects too many times.')


def extract_text(content: bytes, mime: str) -> tuple[str, list[str]]:
    warnings = []
    if len(content) > MAX_BYTES:
        raise HTTPException(413, 'Document exceeds the 10 MiB processing limit.')
    if mime == 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        try:
            presentation = Presentation(BytesIO(content))
            if len(presentation.slides) > MAX_PAGES:
                raise ValueError('Please upload a slide deck with at most 100 slides.')
            slides = []
            for number, slide in enumerate(presentation.slides, 1):
                parts = [shape.text for shape in slide.shapes if hasattr(shape, 'text') and shape.text.strip()]
                slides.append(f'[Slide {number}]\n' + '\n'.join(parts))
            text = '\n\n'.join(slides)
            if not text.strip():
                raise ValueError('No readable text found in this slide deck.')
        except Exception as exc:
            raise HTTPException(422, str(exc) if isinstance(exc, ValueError) else 'This slide deck could not be parsed.') from exc
    elif mime == 'application/pdf':
        try:
            reader = PdfReader(BytesIO(content))
            if reader.is_encrypted:
                raise ValueError('Password-protected PDFs are not supported.')
            if len(reader.pages) > MAX_PAGES:
                raise ValueError('Please upload a syllabus with at most 100 pages.')
            pages = []
            total = 0
            for number, page in enumerate(reader.pages, 1):
                stream = page.get_contents()
                if stream and len(stream.get_data()) > 5 * 1024 * 1024:
                    raise ValueError('This PDF page is too complex to process. Export a text version instead.')
                text = page.extract_text() or ''
                if not text.strip():
                    warnings.append(f'Page {number} has no readable text; it may need OCR.')
                pages.append(f'[Page {number}]\n{text}')
                total += len(text)
                if total > MAX_TEXT:
                    warnings.append('Text was truncated for the extraction preview.')
                    break
            text = '\n\n'.join(pages)
            if not any((page.split('\n', 1)[1]).strip() for page in pages):
                raise ValueError('No readable text found. Scanned PDFs need OCR; upload a text export for now.')
        except Exception as exc:
            raise HTTPException(422, str(exc) if isinstance(exc, ValueError) else 'This PDF could not be parsed.') from exc
    elif mime in ('text/html', 'text/plain'):
        text = content.decode('utf-8', errors='replace')
        if mime == 'text/html':
            soup = BeautifulSoup(text, 'html.parser')
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'noscript']):
                element.decompose()
            text = (soup.find('main') or soup.find('article') or soup).get_text('\n', strip=True)
            warnings.append('Only public page text is read; linked pages and JavaScript-only content are not included.')
    else:
        raise HTTPException(422, 'Text extraction supports PDF, plain text, and HTML only.')
    if not text.strip():
        raise HTTPException(422, 'No readable text found.')
    if len(text) > MAX_TEXT:
        warnings.append(f'Only the first {MAX_TEXT:,} characters are included. Review the original for omitted information.')
    return text[:MAX_TEXT], warnings
