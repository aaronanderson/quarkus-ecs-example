package ecsexample;

import java.security.Principal;

import javax.annotation.security.PermitAll;
import javax.enterprise.context.RequestScoped;
import javax.inject.Inject;
import javax.json.Json;
import javax.json.JsonObject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.SecurityContext;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/example")
@RequestScoped
public class ExampleResource {

	@Inject
	JsonWebToken jwt;

	@ConfigProperty(name = "example.env")
	String env;

	@GET()
	@Path("/hello")
	//@RolesAllowed({ "Everyone" })
	@PermitAll
	@Produces(MediaType.APPLICATION_JSON)
	public JsonObject helloRolesAllowed(@Context SecurityContext ctx) {
		Principal caller = ctx.getUserPrincipal();
		String name = caller == null ? "anonymous" : caller.getName();
		return Json.createObjectBuilder().add("name", name).add("env", env).build();
	}
}