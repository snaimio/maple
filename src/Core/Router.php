<?php
namespace Maple\Core;

class Router
{
    private array $routes = [];

    public function get(string $path, callable|array $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable|array $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function put(string $path, callable|array $handler): void
    {
        $this->add('PUT', $path, $handler);
    }

    public function delete(string $path, callable|array $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    private function add(string $method, string $path, callable|array $handler): void
    {
        // Convert /users/{id} into a regex with a named group
        $pattern = preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $path);
        $this->routes[] = [
            'method'  => $method,
            'pattern' => '#^' . $pattern . '$#',
            'handler' => $handler,
        ];
    }

    public function dispatch(): void
    {
        $method = Request::method();
        $path   = Request::path();

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) continue;
            if (!preg_match($route['pattern'], $path, $matches)) continue;

            $params = array_filter(
                $matches,
                fn($k) => !is_int($k),
                ARRAY_FILTER_USE_KEY
            );

            $handler = $route['handler'];

            if (is_array($handler)) {
                [$class, $methodName] = $handler;
                $controller = new $class();
                $controller->$methodName($params);
            } else {
                $handler($params);
            }
            return;
        }

        Response::error('Route not found', 404);
    }
}
