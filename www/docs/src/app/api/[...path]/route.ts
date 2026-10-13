// unknown `/api/*` paths would otherwise render the html 404 page, which API clients can't parse
const notFound = async (
  request: Request,
  { params }: RouteContext<'/api/[...path]'>,
) =>
  Response.json(
    {
      error: {
        code: 'not_found',
        message: `No API endpoint at ${request.method} /api/${(await params).path.join('/')}.`,
        hint: 'The API is described at /openapi.json. Documentation pages are indexed at /llms.txt.',
      },
    },
    { status: 404 },
  )

export {
  notFound as GET,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
}
